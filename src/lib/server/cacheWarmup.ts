import { env } from '$env/dynamic/private';
import { emby, type EmbyUser } from './emby';
import { timeRangeToString, parseTimeRange } from './stats';
import { getCompletedPeriods, getOrComputeServerStats, isCurrentPeriod } from './serverStatsCache';
import { getOrComputeUserStats, getStatsCacheDir } from './userStatsCache';

// ---------------------------------------------------------------------
// Cache warmup
//
// On boot, pre-computes both the server-wide and per-user caches for
// every completed time frame (a finished year or month), so the first
// real visitor of a period never pays for a cold Emby/Tracearr/TMDB
// fetch. A recurring background refresh then:
//   1. Warms any period that has *just* become completed (month/year
//      rollover), so the next completed period is ready before anyone
//      asks for it.
//   2. Force-refreshes the current, in-progress period, so its short
//      TTL (5 min server-wide / 1 hr per-user) expires into a warm
//      recompute instead of making a real user wait for one.
//
// All of this is best-effort: a failure warming one user/period is
// logged and skipped rather than aborting the whole run, and the whole
// feature can be disabled via CACHE_WARMUP_ENABLED=false.
// ---------------------------------------------------------------------

const WARMUP_ENABLED = (env.CACHE_WARMUP_ENABLED ?? 'true').trim().toLowerCase() !== 'false';
// Defaults to 1 (no parallel users) rather than something higher: each user's
// stats computation can itself fan out into many concurrent HTTP requests
// (Tracearr history pagination, TMDB lookups, Emby item batches), so running
// several users at once multiplies that fan-out and can overwhelm a
// lightweight self-hosted Tracearr/Emby instance. Raise this only if your
// setup has headroom to spare.
const WARMUP_CONCURRENCY = Math.max(1, Number(env.CACHE_WARMUP_CONCURRENCY) || 1);
// A small gap between each user's warmup, even at concurrency 1: each user's
// stats computation is itself a burst of several/many requests (Tracearr
// history pagination, TMDB lookups, Emby item batches), so back-to-back users
// with zero gap can still look like a sustained hammering to a lightweight
// self-hosted Tracearr/Emby instance. Default 1s; set to 0 to disable.
const WARMUP_DELAY_MS = env.CACHE_WARMUP_DELAY_MS !== undefined
    ? Math.max(0, Number(env.CACHE_WARMUP_DELAY_MS) || 0)
    : 1000;
const REFRESH_INTERVAL_MS = Math.max(1, Number(env.CACHE_REFRESH_INTERVAL_MINUTES) || 15) * 60 * 1000;

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// Periods we've already warmed at least once, so the recurring refresh
// only needs to act on newly-completed ones instead of re-scanning everything.
const warmedCompletedPeriods = new Set<string>();

let refreshTimer: ReturnType<typeof setInterval> | null = null;

// Guards against the initial warmup and the recurring refresh (or two
// recurring ticks) ever running at the same time. Without this, a pass
// that runs longer than REFRESH_INTERVAL_MS - entirely possible once
// throttled down for safety - lets the next tick start on top of it,
// doubling the load on Tracearr/Emby instead of waiting its turn.
let isWarmupRunning = false;

async function runExclusive(label: string, fn: () => Promise<void>): Promise<void> {
    if (isWarmupRunning) {
        console.log(`[cache-warmup] Skipping ${label}: a previous warmup/refresh pass is still running.`);
        return;
    }
    isWarmupRunning = true;
    try {
        await fn();
    } finally {
        isWarmupRunning = false;
    }
}

/** Run `fn` over `items` with at most `limit` calls in flight at once. */
async function runWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
    let index = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (index < items.length) {
            const current = items[index++];
            await fn(current);
        }
    });
    await Promise.all(workers);
}

async function warmServerStatsForPeriod(periodParam: string, forceRefresh = false): Promise<void> {
    try {
        await getOrComputeServerStats(periodParam, forceRefresh);
    } catch (e) {
        console.warn(`[cache-warmup] Failed to warm server-wide stats for "${periodParam}":`, e);
    }
}

async function warmUserStatsForPeriod(user: EmbyUser, periodParam: string, forceRefresh = false): Promise<void> {
    try {
        const timeRangeStr = timeRangeToString(parseTimeRange(periodParam));
        await getOrComputeUserStats(user.Id, user.Name, timeRangeStr, forceRefresh);
    } catch (e) {
        console.warn(`[cache-warmup] Failed to warm stats for user "${user.Name}" / "${periodParam}":`, e);
    } finally {
        if (WARMUP_DELAY_MS > 0) await sleep(WARMUP_DELAY_MS);
    }
}

/** Warm server-wide + every user's stats for one period, one user at a time (bounded). */
async function warmPeriodForAllUsers(users: EmbyUser[], periodParam: string, forceRefresh = false): Promise<void> {
    await warmServerStatsForPeriod(periodParam, forceRefresh);
    await runWithConcurrency(users, WARMUP_CONCURRENCY, (user) => warmUserStatsForPeriod(user, periodParam, forceRefresh));
}

/**
 * Warm every completed period for every user, plus server-wide stats.
 * Intended to run once, in the background, right after the server starts.
 */
export async function runInitialWarmup(): Promise<void> {
    if (!WARMUP_ENABLED) {
        console.log('[cache-warmup] Disabled via CACHE_WARMUP_ENABLED=false, skipping.');
        return;
    }

    await runExclusive('initial warmup', async () => {
        const startedAt = Date.now();
        try {
            const users = await emby.getUsers();
            const completedPeriods = getCompletedPeriods();

            console.log(
                `[cache-warmup] Starting: ${completedPeriods.length} completed period(s), ` +
                `${users.length} user(s), per-user cache dir "${getStatsCacheDir()}".`
            );

            // Most-recent period first, since that's what people open first.
            for (const period of completedPeriods) {
                await warmPeriodForAllUsers(users, period);
                warmedCompletedPeriods.add(period);
            }

            // Bonus: also warm the current, in-progress period so it's hot
            // from the very first request too, not just completed ones.
            // includeUserYearRefresh: true because this only happens once, at
            // startup - unlike the recurring refresh, which deliberately
            // skips the expensive per-user "current year" recompute (see
            // refreshCurrentPeriod below).
            await refreshCurrentPeriod(users, { includeUserYearRefresh: true });

            console.log(`[cache-warmup] Finished in ${Math.round((Date.now() - startedAt) / 1000)}s.`);
        } catch (e) {
            console.error('[cache-warmup] Initial warmup failed:', e);
        }
    });
}

/**
 * Force-refresh the current year and current month-of-year period.
 *
 * Server-wide stats decompose a year into per-month buckets and cache
 * completed months indefinitely (see serverStatsCache.ts), so refreshing
 * "current year" there is cheap - it only re-fetches the still-open month.
 * Per-user stats have no such decomposition: a "current year" fetch always
 * re-queries the ENTIRE year-to-date range from Tracearr/Emby for that one
 * user, and that window only grows as the year goes on (by September,
 * that's ~9 months of history, every time). Repeating that indefinitely on
 * a 15-minute schedule for every user is what was keeping Tracearr pegged.
 * So per-user "current year" is only force-refreshed when explicitly asked
 * for (i.e. once, at startup) - the recurring refresh only keeps the much
 * cheaper current *month* hot per-user, and leaves "current year" to its
 * normal 1-hour cache TTL for whichever real visitor happens to look at it.
 */
async function refreshCurrentPeriod(users: EmbyUser[], options: { includeUserYearRefresh: boolean }): Promise<void> {
    const now = new Date();
    const currentYearParam = String(now.getFullYear());
    const currentMonthParam = `${now.getMonth() + 1}-${now.getFullYear()}`;

    for (const period of [currentYearParam, currentMonthParam]) {
        const timeRange = parseTimeRange(period);
        if (!isCurrentPeriod(timeRange)) continue; // shouldn't happen, but stay safe

        await warmServerStatsForPeriod(period, /* forceRefresh */ true);

        const isYearPeriod = timeRange.type === 'year';
        if (isYearPeriod && !options.includeUserYearRefresh) {
            continue;
        }

        await runWithConcurrency(users, WARMUP_CONCURRENCY, (user) => warmUserStatsForPeriod(user, period, /* forceRefresh */ true));
    }
}

/** Warm any period that has newly become "completed" since the last check (month/year rollover). */
async function warmNewlyCompletedPeriods(users: EmbyUser[]): Promise<void> {
    const completedPeriods = getCompletedPeriods();
    const newPeriods = completedPeriods.filter((p) => !warmedCompletedPeriods.has(p));
    if (newPeriods.length === 0) return;

    console.log(`[cache-warmup] Rollover detected, warming newly-completed period(s): ${newPeriods.join(', ')}`);
    for (const period of newPeriods) {
        await warmPeriodForAllUsers(users, period);
        warmedCompletedPeriods.add(period);
    }
}

/**
 * Start the recurring background refresh. Safe to call once; a second
 * call is a no-op so re-invoking doesn't stack up multiple timers.
 */
export function scheduleRecurringRefresh(): void {
    if (!WARMUP_ENABLED || refreshTimer) return;

    refreshTimer = setInterval(() => {
        runExclusive('recurring refresh', async () => {
            try {
                const users = await emby.getUsers();
                await warmNewlyCompletedPeriods(users);
                // includeUserYearRefresh: false - see refreshCurrentPeriod's
                // doc comment for why the recurring pass never forces the
                // expensive per-user "current year" recompute.
                await refreshCurrentPeriod(users, { includeUserYearRefresh: false });
            } catch (e) {
                console.error('[cache-warmup] Recurring refresh failed:', e);
            }
        });
    }, REFRESH_INTERVAL_MS);

    // Don't let this timer keep the process alive on its own if something
    // else initiates a graceful shutdown.
    refreshTimer.unref?.();

    console.log(`[cache-warmup] Recurring refresh scheduled every ${REFRESH_INTERVAL_MS / 60000} minute(s).`);
}
