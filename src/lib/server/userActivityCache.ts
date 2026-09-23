import { emby, type PlaybackActivity } from './emby';
import { calculateLookbackDays, isCompletedMonth, getMonthsInRange, matchesTimeRange, type TimeRange } from './timeRange';

// ---------------------------------------------------------------------
// Per-user, per-month raw activity cache
//
// Mirrors serverStatsCache.ts's monthActivityCache, but scoped per user and
// storing full PlaybackActivity records (not a stripped-down shape), since
// per-user stats need device fields, item ids, and the _fromTracearr flag
// for downstream aggregation in stats.ts's aggregateUserStats.
//
// A completed month's playback activity can never change once it's over,
// so it's cached indefinitely. A "year" request then only needs a fresh
// fetch for the current, still-in-progress month - every earlier month is
// served straight from this cache.
//
// Why this exists: under Tracearr, a "current year" fetch previously always
// re-queried the ENTIRE year-to-date window for that one user, no matter
// how often it was asked for - and that window only grows as the year goes
// on. Refreshing it on any recurring schedule pegged Tracearr's CPU
// continuously; refreshing it rarely left a real visitor to pay for the
// full multi-month recompute themselves (~30s). Decomposing it into cached
// month buckets - the same fix already in place for server-wide stats -
// removes both problems: the recompute is cheap because only the open
// month is ever actually fetched.
// ---------------------------------------------------------------------

const userMonthActivityCache = new Map<string, PlaybackActivity[]>();

function monthCacheKey(userId: string, year: number, month: number): string {
    return `${userId}:${year}-${month}`;
}

/** Split a flat list of raw activity items into per-month buckets, keyed for `userId`. */
function partitionByMonth(
    userId: string,
    items: PlaybackActivity[],
    months: { year: number; month: number }[]
): Map<string, PlaybackActivity[]> {
    const buckets = new Map<string, PlaybackActivity[]>();
    for (const { year, month } of months) buckets.set(monthCacheKey(userId, year, month), []);

    for (const item of items) {
        for (const { year, month } of months) {
            if (matchesTimeRange(item.date, { type: 'month', year, month })) {
                buckets.get(monthCacheKey(userId, year, month))!.push(item);
                break; // an item belongs to exactly one month
            }
        }
    }

    return buckets;
}

/**
 * Get a user's playback activity covering `range`.
 *
 * Under Tracearr, this decomposes `range` into calendar-month buckets,
 * serving completed months from the per-user month cache and only fetching
 * whatever's missing (in practice: just the current month, once the cache
 * is warm).
 *
 * Under the Playback Reporting plugin, this is left as a single, unscoped
 * fetch, unchanged from before - that endpoint is a cheap, first-party Emby
 * report for the requested day count, not a raw-history fetch/paginate
 * against a separate service, so it never had the problem this solves.
 */
export async function getUserActivityForRange(userId: string, range: TimeRange): Promise<PlaybackActivity[]> {
    if (!emby.useTracearrHistory) {
        return emby.getUserPlaybackActivity(userId, calculateLookbackDays(range));
    }

    const neededMonths = getMonthsInRange(range);
    const cachedBuckets = new Map<string, PlaybackActivity[]>();
    const missingMonths: { year: number; month: number }[] = [];

    for (const m of neededMonths) {
        const key = monthCacheKey(userId, m.year, m.month);
        if (isCompletedMonth(m.year, m.month) && userMonthActivityCache.has(key)) {
            cachedBuckets.set(key, userMonthActivityCache.get(key)!);
        } else {
            missingMonths.push(m);
        }
    }

    let fetchedBuckets = new Map<string, PlaybackActivity[]>();

    if (missingMonths.length > 0) {
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const onlyCurrentMonthMissing =
            missingMonths.length === 1 &&
            missingMonths[0].year === currentYear &&
            missingMonths[0].month === currentMonth;

        // If the only gap is the current, in-progress month we only need a
        // small window since it began. Otherwise (cold cache, or several
        // months missing) fetch one window that covers every missing month
        // in a single request.
        const oldestMissing = missingMonths.reduce((a, b) =>
            a.year < b.year || (a.year === b.year && a.month < b.month) ? a : b
        );
        const days = onlyCurrentMonthMissing
            ? calculateLookbackDays({ type: 'month', year: currentYear, month: currentMonth })
            : calculateLookbackDays({ type: 'month', year: oldestMissing.year, month: oldestMissing.month });

        const rawActivity = await emby.getUserPlaybackActivity(userId, days);
        fetchedBuckets = partitionByMonth(userId, rawActivity, missingMonths);

        // Cache the buckets that represent completed months so future
        // requests don't need to re-fetch them.
        for (const m of missingMonths) {
            if (isCompletedMonth(m.year, m.month)) {
                const key = monthCacheKey(userId, m.year, m.month);
                userMonthActivityCache.set(key, fetchedBuckets.get(key) ?? []);
            }
        }
    }

    const allActivity: PlaybackActivity[] = [];
    for (const m of neededMonths) {
        const key = monthCacheKey(userId, m.year, m.month);
        const bucket = cachedBuckets.get(key) ?? fetchedBuckets.get(key) ?? [];
        allActivity.push(...bucket);
    }

    return allActivity;
}
