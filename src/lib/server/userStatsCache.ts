import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { env } from '$env/dynamic/private';
import { tmdb } from './tmdb';
import {
    aggregateUserStats,
    parseTimeRange,
    type UserStats,
    type TopItem,
    type SeriesCompletionStat
} from './stats';

// ---------------------------------------------------------------------
// Per-user stats cache
//
// Stored on disk (rather than in-memory) so it survives across requests
// without holding every user's full stats payload in process memory.
//
// Where it lives:
//   - STATS_CACHE_DIR, if set, is used as-is. Point this at a mounted
//     volume to keep the cache warm across container restarts.
//   - Otherwise, falls back to the previous default: /tmp/stats-cache in
//     production (since the rest of the container's filesystem is
//     read-only) or .cache/stats in dev. Both of these are wiped on
//     restart, same as before this cache dir became configurable.
// ---------------------------------------------------------------------

const STATS_CACHE_DIR =
    env.STATS_CACHE_DIR?.trim() ||
    (process.env.NODE_ENV === 'production' ? '/tmp/stats-cache' : '.cache/stats');

// How long a computed stats entry stays fresh before a request (or the
// recurring background refresh in cacheWarmup.ts) recomputes it.
const STATS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cacheDirReady = false;
function ensureCacheDir(): boolean {
    if (cacheDirReady) return true;
    try {
        if (!existsSync(STATS_CACHE_DIR)) {
            mkdirSync(STATS_CACHE_DIR, { recursive: true });
        }
        cacheDirReady = true;
    } catch (e) {
        console.warn(
            `Could not create stats cache directory at "${STATS_CACHE_DIR}". ` +
            `If you set STATS_CACHE_DIR to a mounted volume, make sure the container ` +
            `user has write access to it. Falling back to no per-user caching:`,
            e
        );
    }
    return cacheDirReady;
}

interface CachedStats {
    stats: UserStats;
    timestamp: number;
}

function cachePath(userId: string, timeRange: string): string {
    return join(STATS_CACHE_DIR, `${userId}_${timeRange}.json`);
}

function getCachedStats(userId: string, timeRange: string): UserStats | null {
    if (!ensureCacheDir()) return null;
    const path = cachePath(userId, timeRange);
    if (!existsSync(path)) return null;

    try {
        const cached: CachedStats = JSON.parse(readFileSync(path, 'utf-8'));
        const age = Date.now() - cached.timestamp;

        if (age < STATS_CACHE_TTL_MS) {
            return cached.stats;
        }
    } catch {
        // Cache read failed
    }
    return null;
}

function setCachedStats(userId: string, timeRange: string, stats: UserStats): void {
    if (!ensureCacheDir()) return;
    try {
        const cached: CachedStats = { stats, timestamp: Date.now() };
        writeFileSync(cachePath(userId, timeRange), JSON.stringify(cached));
    } catch (e) {
        console.warn(`Failed to write stats cache for user ${userId}/${timeRange}:`, e);
    }
}

/**
 * Check if an ID looks like a real Emby item id rather than a title-derived
 * slug, which is what decides whether the library's own poster is kept.
 *
 * Both id shapes are in the wild: current servers use 32-char hex, older ones
 * hand out short numeric ids (this instance's series are e.g. "174698"). Only
 * the slug form is unaddressable, so accept anything else — rejecting a short
 * numeric id silently threw away a perfectly good library poster and replaced
 * it with a title search, which is how 《老友记》 got 《快乐老友记》's artwork.
 */
function isValidEmbyId(id: string): boolean {
    return /^(?:[0-9a-f]{32}|\d+)$/i.test(id);
}

/**
 * Enhance images for top items - use TMDB when Emby ID is invalid
 */
async function enhanceTopItemImages(items: TopItem[], type: 'show' | 'movie'): Promise<TopItem[]> {
    const enhanced = await Promise.all(items.map(async (item) => {
        const hasValidEmbyId = isValidEmbyId(item.id) || (item.seriesId && isValidEmbyId(item.seriesId));

        if (!hasValidEmbyId) {
            try {
                const tmdbUrl = await tmdb.findPosterUrl(item.name, type === 'show' ? 'tv' : 'movie');
                if (tmdbUrl) {
                    return {
                        ...item,
                        imageUrl: tmdbUrl,
                        tmdbImageUrl: tmdbUrl
                    };
                }
            } catch {
                // TMDB lookup failed, keep original
            }
        } else {
            try {
                const tmdbUrl = await tmdb.findPosterUrl(item.name, type === 'show' ? 'tv' : 'movie');
                if (tmdbUrl) {
                    return {
                        ...item,
                        tmdbImageUrl: tmdbUrl
                    };
                }
            } catch {
                // Silently fail
            }
        }
        return item;
    }));

    return enhanced;
}

async function enhanceSeriesCompletionImages(items: SeriesCompletionStat[]): Promise<SeriesCompletionStat[]> {
    const enhanced = await Promise.all(items.map(async (item) => {
        const hasValidEmbyId = isValidEmbyId(item.id);

        if (!hasValidEmbyId) {
            try {
                const tmdbUrl = await tmdb.findPosterUrl(item.name, 'tv');
                if (tmdbUrl) {
                    return {
                        ...item,
                        imageUrl: tmdbUrl
                    };
                }
            } catch {
                // TMDB lookup failed, keep original
            }
        }

        return item;
    }));

    return enhanced;
}

/**
 * Get a user's Wrapped stats for a period, serving from the on-disk cache
 * when a fresh-enough entry exists. On a miss, computes the full stats
 * (including TMDB image enhancement) and writes the result back to cache.
 *
 * `forceRefresh` bypasses a still-valid cache entry — used by the
 * scheduled background refresh to keep the current, in-progress period
 * warm ahead of its TTL expiring under a real user.
 */
export async function getOrComputeUserStats(
    userId: string,
    username: string,
    timeRangeStr: string,
    forceRefresh = false
): Promise<UserStats> {
    if (!forceRefresh) {
        const cached = getCachedStats(userId, timeRangeStr);
        if (cached) return cached;
    }

    const timeRange = parseTimeRange(timeRangeStr);

    let stats = await aggregateUserStats(userId, username, timeRange);

    const [enhancedShows, enhancedMovies, enhancedSeriesCompletion] = await Promise.all([
        enhanceTopItemImages(stats.topShows, 'show'),
        enhanceTopItemImages(stats.topMovies, 'movie'),
        enhanceSeriesCompletionImages(stats.seriesCompletion)
    ]);

    stats = {
        ...stats,
        topShows: enhancedShows,
        topMovies: enhancedMovies,
        seriesCompletion: enhancedSeriesCompletion
    };

    setCachedStats(userId, timeRangeStr, stats);
    return stats;
}

/** Exposed for diagnostics/logging (e.g. at startup). */
export function getStatsCacheDir(): string {
    return STATS_CACHE_DIR;
}
