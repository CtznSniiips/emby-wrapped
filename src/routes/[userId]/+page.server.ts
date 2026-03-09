import { error, redirect } from '@sveltejs/kit';
import { emby } from '$lib/server/emby';
import { tmdb } from '$lib/server/tmdb';
import { aggregateUserStats, parseTimeRange, timeRangeToString, getAvailableTimeRanges, type UserStats, type TopItem, type TimeRange, type SeriesCompletionStat } from '$lib/server/stats';
import type { PageServerLoad } from './$types';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

// Use /tmp for cache in production (Docker read-only filesystem)
const STATS_CACHE_DIR = process.env.NODE_ENV === 'production' ? '/tmp/stats-cache' : '.cache/stats';
const STATS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

// Ensure cache directory exists
try {
    if (!existsSync(STATS_CACHE_DIR)) {
        mkdirSync(STATS_CACHE_DIR, { recursive: true });
    }
} catch (e) {
    console.warn('Could not create stats cache directory:', e);
}

interface CachedStats {
    stats: UserStats;
    timestamp: number;
}

function getCachedStats(userId: string, timeRange: string): UserStats | null {
    const cachePath = join(STATS_CACHE_DIR, `${userId}_${timeRange}.json`);
    if (!existsSync(cachePath)) return null;

    try {
        const cached: CachedStats = JSON.parse(readFileSync(cachePath, 'utf-8'));
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
    const cachePath = join(STATS_CACHE_DIR, `${userId}_${timeRange}.json`);
    try {
        const cached: CachedStats = { stats, timestamp: Date.now() };
        writeFileSync(cachePath, JSON.stringify(cached));
    } catch {
        // Cache write failed, continue without caching
    }
}

/**
 * Check if an ID looks like a valid Emby UUID (not a slug)
 */
function isValidEmbyId(id: string): boolean {
    return /^[0-9a-f]{32}$/i.test(id);
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
export const load: PageServerLoad = async ({ params, url, locals }) => {
    const { userId: userIdentifier } = params;
    const requestedPeriod = url.searchParams.get('period');
    const periodQuery = requestedPeriod ? `&period=${encodeURIComponent(requestedPeriod)}` : '';

    if (!locals.authUser) {
        throw redirect(307, `/?user=${encodeURIComponent(userIdentifier)}${periodQuery}`);
    }

    // Legacy shorthand links like `/:userId?2026` should land on community stats first
    // while preserving both user and period as homepage query params.
    const rawQuery = url.search.slice(1);
    const shorthandParam = !rawQuery.includes('=') && rawQuery ? decodeURIComponent(rawQuery) : null;
    if (shorthandParam) {
        const nextUrl = `/?user=${encodeURIComponent(userIdentifier)}&period=${encodeURIComponent(shorthandParam)}`;
        throw redirect(307, nextUrl);
    }

    // Direct links like `/:userId` should open the community intro flow first,
    // with the username prefilled for the final step.
    const hasPeriodParam = url.searchParams.has('period');
    if (!rawQuery && !hasPeriodParam) {
        const nextUrl = `/?user=${encodeURIComponent(userIdentifier)}`;
        throw redirect(307, nextUrl);
    }

    // Get time range from URL parameter, default to previous year
    const now = new Date();
    const defaultTimeRange = String(now.getFullYear() - 1);
    const periodParam = url.searchParams.get('period');
    const timeRangeParam = periodParam || defaultTimeRange;
    const timeRange = parseTimeRange(timeRangeParam);
    const timeRangeStr = timeRangeToString(timeRange);

    try {
        const users = await emby.getUsers();
        const user = users.find((u) =>
            u.Id === userIdentifier || u.Name.toLowerCase() === userIdentifier.toLowerCase()
        );

        if (!user) {
            throw error(404, 'User not found');
        }

        if (locals.authUser.id !== user.Id) {
            throw redirect(307, `/${locals.authUser.id}${requestedPeriod ? `?period=${encodeURIComponent(requestedPeriod)}` : ''}`);
        }

        // Check cache first
        let stats = getCachedStats(user.Id, timeRangeStr);

        if (!stats) {
            // Cache miss - compute stats
            stats = await aggregateUserStats(user.Id, user.Name, timeRange);

            // Enhance images with TMDB fallbacks
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

            // Save to cache
            setCachedStats(user.Id, timeRangeStr, stats);
        }

        const rawUserImageUrl = user.PrimaryImageTag
            ? emby.getUserImageUrl(user.Id)
            : null;

        // Proxy the image to avoid Local Network Access browser restrictions
        const userImageUrl = rawUserImageUrl
            ? `/api/proxy-image?url=${encodeURIComponent(rawUserImageUrl)}`
            : null;

        // Get available time range options
        const timeRangeOptions = getAvailableTimeRanges();

        return {
            stats,
            userImageUrl,
            serverName: 'Emby for the People',
            currentTimeRange: timeRangeStr,
            timeRangeOptions
        };
    } catch (e) {
        if ((e as { status?: number }).status === 404) {
            throw e;
        }

        throw error(500, 'Failed to load your wrapped data');
    }
};
