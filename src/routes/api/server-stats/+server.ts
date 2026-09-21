import { json } from '@sveltejs/kit';
import { emby, type EmbyItem, type EmbyUser } from '$lib/server/emby';
import { tmdb } from '$lib/server/tmdb';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { parseTimeRange, timeRangeToString, calculateLookbackDays, matchesTimeRange, type TopItem, type MusicStats, type TimeRange } from '$lib/server/stats';
import { getAuthSession } from '$lib/server/auth';
import { getAllTracearrPlaybackActivity } from '$lib/server/tracearr';

export interface ServerStats {
    totalUsers: number;
    totalMinutes: number;
    totalMovies: number;
    totalEpisodes: number;
    peakMonth: number;
    monthlyMinutes: number[];
    topShows: TopItem[];
    topMovies: TopItem[];
    music: MusicStats;
    seerrRequests: {
        totalRequests: number;
        movieRequests: number;
        seriesRequests: number;
        requestsByUser: Array<{ name: string; count: number; movieRequests: number; seriesRequests: number }>;
    } | null;
    year: number;
    timeRangeLabel: string;
}

interface SeerrRequest {
    id: number;
    createdAt: string;
    type?: string;
    media?: {
        mediaType?: string;
    };
    requestedBy?: {
        id?: number;
        displayName?: string;
        username?: string;
    };
}

function getRequestCategory(request: SeerrRequest): 'movie' | 'series' | null {
    const normalizedType = request.type?.toLowerCase() || request.media?.mediaType?.toLowerCase();
    if (normalizedType === 'movie') return 'movie';
    if (normalizedType === 'tv' || normalizedType === 'series' || normalizedType === 'show') return 'series';
    return null;
}

interface SeerrRequestsResponse {
    results?: SeerrRequest[];
    pageInfo?: {
        pages?: number;
    };
}

async function fetchSeerrRequestStats(timeRange: TimeRange): Promise<ServerStats['seerrRequests']> {
    const seerrUrl = env.SEERR_URL?.trim();
    const seerrApiKey = env.SEERR_API_KEY?.trim();
    if (!seerrUrl || !seerrApiKey) return null;

    try {
        const normalizedUrl = seerrUrl.replace(/\/$/, '');
        const allRequests: SeerrRequest[] = [];

        const fetchSeerrPage = async (page: number): Promise<SeerrRequestsResponse> => {
            const skip = (page - 1) * 100;
            const response = await fetch(`${normalizedUrl}/api/v1/request?skip=${skip}&take=100`, {
                headers: {
                    'X-Api-Key': seerrApiKey,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch Seerr requests: ${response.status}`);
            }
            return response.json();
        };

        // Fetch page 1 first to learn the real total page count, then fetch
        // the rest concurrently instead of one page at a time.
        const firstPage = await fetchSeerrPage(1);
        allRequests.push(...(firstPage.results || []));
        const totalPages = Math.max(firstPage.pageInfo?.pages || 1, 1);

        if (totalPages > 1) {
            const remainingPages = Array.from({ length: totalPages - 1 }, (_, i) => i + 2);
            const PARALLEL_BATCH = 8;
            for (let i = 0; i < remainingPages.length; i += PARALLEL_BATCH) {
                const batch = remainingPages.slice(i, i + PARALLEL_BATCH);
                const results = await Promise.all(batch.map(fetchSeerrPage));
                for (const data of results) allRequests.push(...(data.results || []));
            }
        }

        const requestsInTimeRange = allRequests.filter((request) =>
            matchesTimeRange(request.createdAt, timeRange)
        );

        const requestsByUserMap = new Map<string, { count: number; movieRequests: number; seriesRequests: number }>();
        let movieRequests = 0;
        let seriesRequests = 0;

        for (const request of requestsInTimeRange) {
            const user = request.requestedBy;
            const userName = user?.displayName || user?.username || 'Unknown User';
            const existing = requestsByUserMap.get(userName) || { count: 0, movieRequests: 0, seriesRequests: 0 };
            const category = getRequestCategory(request);

            existing.count += 1;
            if (category === 'movie') {
                existing.movieRequests += 1;
                movieRequests += 1;
            } else if (category === 'series') {
                existing.seriesRequests += 1;
                seriesRequests += 1;
            }

            requestsByUserMap.set(userName, existing);
        }

        const requestsByUser = [...requestsByUserMap.entries()]
            .map(([name, stats]) => ({
                name,
                count: stats.count,
                movieRequests: stats.movieRequests,
                seriesRequests: stats.seriesRequests
            }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        return {
            totalRequests: requestsInTimeRange.length,
            movieRequests,
            seriesRequests,
            requestsByUser
        };
    } catch (e) {
        console.warn('Failed to fetch Seerr request stats:', e);
        return null;
    }
}

// ---------------------------------------------------------------------
// Per-month raw activity cache
//
// A completed month's playback activity can never change once it's over,
// so we cache the (already permission-filtered) raw items for each
// completed month indefinitely. When a "year" request comes in, only the
// current, still-in-progress month needs a fresh fetch — every earlier
// month is served straight from this cache, so we skip re-hitting
// Tracearr/Emby (and re-running permission filtering) for months that
// can't have changed.
// ---------------------------------------------------------------------

interface MonthPlaybackItem {
    date: string;
    duration: string;
    item_type: string;
    item_name: string;
    item_id: string | number;
}

const monthActivityCache = new Map<string, MonthPlaybackItem[]>();

function monthCacheKey(year: number, month: number): string {
    return `${year}-${month}`;
}

function isCompletedMonth(year: number, month: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return year < currentYear || (year === currentYear && month < currentMonth);
}

/**
 * Fetch raw playback activity for the last `days` days (from every user),
 * applying the same permission filtering the old single-pass version did.
 * Returns a flat, un-partitioned list — callers slice it into months.
 */
async function fetchRawActivityWindow(
    users: EmbyUser[],
    filterUserId: string | undefined,
    fetchUserId: string | undefined,
    days: number
): Promise<MonthPlaybackItem[]> {
    const rawActivities: { activity: any[] }[] = [];
    const allItemIds = new Set<string>();

    if (emby.useTracearrHistory) {
        const userMap = new Map(users.map((user) => [user.Id, user.Name]));
        const allTracearrActivity = await getAllTracearrPlaybackActivity({
            tracearrUrl: emby.tracearrUrl,
            tracearrApiKey: emby.tracearrApiKey,
            users: userMap,
            days
        });

        for (const user of users) {
            const activity = allTracearrActivity.get(user.Id) ?? [];
            rawActivities.push({ activity });
            activity.forEach((item) => allItemIds.add(String(item.item_id)));
        }
    } else {
        // Fetch activities in parallel for Playback Reporting mode
        const BATCH_SIZE = 10;
        for (let i = 0; i < users.length; i += BATCH_SIZE) {
            const batch = users.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.allSettled(
                batch.map(async (user) => {
                    const activity = await emby.getUserPlaybackActivity(user.Id, days);
                    return { activity };
                })
            );

            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    rawActivities.push(result.value);
                    result.value.activity.forEach((item) => allItemIds.add(String(item.item_id)));
                }
            }
        }
    }

    // Fetch item details using filter user (if set) for permission
    // filtering, in parallel batches of 50 IDs.
    const itemDetails = new Map<string, EmbyItem>();
    const itemIdList = [...allItemIds];

    if (itemIdList.length > 0 && fetchUserId) {
        try {
            const batches: string[][] = [];
            for (let i = 0; i < itemIdList.length; i += 50) {
                batches.push(itemIdList.slice(i, i + 50));
            }
            const batchResults = await Promise.allSettled(
                batches.map((batch) => emby.getItems(fetchUserId, batch))
            );
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    result.value.forEach((item) => itemDetails.set(item.Id, item));
                } else {
                    console.warn('Failed to fetch an item detail batch for server stats:', result.reason);
                }
            }
        } catch (e) {
            console.warn('Failed to fetch item details for server stats:', e);
        }
    }

    const items: MonthPlaybackItem[] = [];
    for (const { activity } of rawActivities) {
        for (const item of activity) {
            // Check permission / existence.
            // If filterUserId is set, we strictly require the item to be found in itemDetails
            if (filterUserId && !item._fromTracearr && !itemDetails.has(String(item.item_id))) {
                continue;
            }
            items.push({
                date: item.date,
                duration: item.duration,
                item_type: item.item_type,
                item_name: item.item_name,
                item_id: item.item_id
            });
        }
    }

    return items;
}

/** Split a flat list of raw activity items into per-month buckets. */
function partitionByMonth(
    items: MonthPlaybackItem[],
    months: { year: number; month: number }[]
): Map<string, MonthPlaybackItem[]> {
    const buckets = new Map<string, MonthPlaybackItem[]>();
    for (const { year, month } of months) buckets.set(monthCacheKey(year, month), []);

    for (const item of items) {
        for (const { year, month } of months) {
            if (matchesTimeRange(item.date, { type: 'month', year, month })) {
                buckets.get(monthCacheKey(year, month))!.push(item);
                break; // an item belongs to exactly one month
            }
        }
    }

    return buckets;
}

/**
 * Gather all raw activity items needed to cover `neededMonths`, using the
 * month cache wherever possible and only hitting Tracearr/Emby for months
 * that are missing (in practice: just the current month, once the cache
 * is warm).
 */
async function gatherActivityForMonths(
    users: EmbyUser[],
    filterUserId: string | undefined,
    fetchUserId: string | undefined,
    neededMonths: { year: number; month: number }[]
): Promise<MonthPlaybackItem[]> {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const cachedBuckets = new Map<string, MonthPlaybackItem[]>();
    const missingMonths: { year: number; month: number }[] = [];

    for (const m of neededMonths) {
        const key = monthCacheKey(m.year, m.month);
        if (isCompletedMonth(m.year, m.month) && monthActivityCache.has(key)) {
            cachedBuckets.set(key, monthActivityCache.get(key)!);
        } else {
            missingMonths.push(m);
        }
    }

    let fetchedBuckets = new Map<string, MonthPlaybackItem[]>();

    if (missingMonths.length > 0) {
        const onlyCurrentMonthMissing =
            missingMonths.length === 1 &&
            missingMonths[0].year === currentYear &&
            missingMonths[0].month === currentMonth;

        // If the only gap is the current, in-progress month we only need a
        // small window since it began. Otherwise (cold cache, or several
        // months missing) fetch one window that covers every missing
        // month in a single request.
        const oldestMissing = missingMonths.reduce((a, b) =>
            a.year < b.year || (a.year === b.year && a.month < b.month) ? a : b
        );
        const days = onlyCurrentMonthMissing
            ? calculateLookbackDays({ type: 'month', year: currentYear, month: currentMonth })
            : calculateLookbackDays({ type: 'month', year: oldestMissing.year, month: oldestMissing.month });

        const rawItems = await fetchRawActivityWindow(users, filterUserId, fetchUserId, days);
        fetchedBuckets = partitionByMonth(rawItems, missingMonths);

        // Cache the buckets that represent completed months so future
        // requests don't need to re-fetch or re-filter them.
        for (const m of missingMonths) {
            if (isCompletedMonth(m.year, m.month)) {
                monthActivityCache.set(monthCacheKey(m.year, m.month), fetchedBuckets.get(monthCacheKey(m.year, m.month)) ?? []);
            }
        }
    }

    const allItems: MonthPlaybackItem[] = [];
    for (const m of neededMonths) {
        const key = monthCacheKey(m.year, m.month);
        const bucket = cachedBuckets.get(key) ?? fetchedBuckets.get(key) ?? [];
        allItems.push(...bucket);
    }

    return allItems;
}

// Cache for the final, assembled server stats response. Completed periods
// (past years/months) can't change, so they're cached indefinitely once
// computed. Only the current, in-progress period gets a short TTL since
// new plays keep coming in for it — and even then, gatherActivityForMonths
// above means recomputing it is cheap since only the current month needs
// a fresh fetch.
const cachedStatsMap = new Map<string, { stats: ServerStats; time: number }>();
const CURRENT_PERIOD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const GET: RequestHandler = async ({ url, cookies }) => {  // add cookies
    const session = getAuthSession(cookies);
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const periodParam = url.searchParams.get('period') || String(new Date().getFullYear() - 1);
        const timeRange = parseTimeRange(periodParam);
        const timeRangeStr = timeRangeToString(timeRange);
        const cacheKey = timeRangeStr;

        // A period is still "in progress" (and needs periodic re-fetching)
        // if it's the current year, or the current month within the current
        // year. Anything earlier is a completed period whose stats can
        // never change once computed, so it's safe to cache indefinitely.
        const now = new Date();
        const isCurrentPeriod =
            timeRange.year === now.getFullYear() &&
            (timeRange.type === 'year' || timeRange.month === now.getMonth() + 1);

        // Return cached data if still valid. Completed periods never expire;
        // the current period expires after CURRENT_PERIOD_CACHE_TTL.
        const cached = cachedStatsMap.get(cacheKey);
        if (cached && (!isCurrentPeriod || Date.now() - cached.time < CURRENT_PERIOD_CACHE_TTL)) {
            console.log(`Returning cached server stats for ${cacheKey}`);
            return json(cached.stats);
        }

        console.log(`Generating fresh server stats for ${cacheKey}...`);
        const startTime = Date.now();

        const users = await emby.getUsers();
        const filterUserId = env.FILTER_USER_ID;
        const fetchUserId = filterUserId || (users.find((u) => u.Policy?.IsAdministrator)?.Id || users[0]?.Id);

        // Figure out which (year, month) buckets this request needs, then
        // let gatherActivityForMonths serve completed ones from cache and
        // only fetch what's actually missing.
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth() + 1;

        const neededMonths: { year: number; month: number }[] =
            timeRange.type === 'month' && timeRange.month
                ? [{ year: timeRange.year, month: timeRange.month }]
                : Array.from(
                      { length: timeRange.year === currentYear ? currentMonth : 12 },
                      (_, i) => ({ year: timeRange.year, month: i + 1 })
                  );

        const allItems = await gatherActivityForMonths(users, filterUserId, fetchUserId, neededMonths);

        // Aggregate stats
        let totalMinutes = 0;
        let totalMovies = 0;
        let totalEpisodes = 0;
        const monthlyMinutes = new Array(12).fill(0);
        const showMap = new Map<string, { name: string; minutes: number; count: number }>();
        const movieMap = new Map<string, { name: string; minutes: number; count: number }>();

        // Music aggregation
        let musicTotalMinutes = 0;
        let musicTrackCount = 0;
        const artistMap = new Map<string, { minutes: number; count: number; trackId?: string }>();
        const trackMap = new Map<string, { name: string; artist: string; minutes: number; count: number; trackId: string }>();

        for (const item of allItems) {
            // Belt-and-suspenders: the per-month gathering above already
            // scopes items to the requested months, but re-check against
            // the full requested range in case of any edge cases.
            if (!matchesTimeRange(item.date, timeRange)) continue;

            const durationSeconds = parseInt(item.duration, 10) || 0;
            const minutes = Math.round(durationSeconds / 60);

            // Music
            const itemType = item.item_type?.toLowerCase();
            const trackId = String(item.item_id);
            if (itemType === 'audio' || itemType === 'musicalbum') {
                musicTotalMinutes += minutes;
                musicTrackCount++;

                // Extract artist
                const parts = item.item_name.split(' - ');
                const artist = parts.length > 1 ? parts[0].trim() : 'Unknown Artist';
                const trackName = parts.length > 1 ? parts.slice(1).join(' - ') : item.item_name;

                // Artist stats
                const existingArtist = artistMap.get(artist) || { minutes: 0, count: 0, trackId };
                existingArtist.minutes += minutes;
                existingArtist.count += 1;
                if (!existingArtist.trackId) existingArtist.trackId = trackId;
                artistMap.set(artist, existingArtist);

                // Track stats
                const trackKey = `${artist}|||${trackName}`;
                const existingTrack = trackMap.get(trackKey) || { name: trackName, artist, minutes: 0, count: 0, trackId };
                existingTrack.minutes += minutes;
                existingTrack.count += 1;
                trackMap.set(trackKey, existingTrack);
                continue;
            }

            totalMinutes += minutes;

            // Parse date for monthly breakdown
            const date = new Date(item.date);
            const month = date.getMonth();
            if (month >= 0 && month < 12) {
                monthlyMinutes[month] += minutes;
            }

            // Count by type
            if (itemType === 'movie') {
                totalMovies++;
                const name = item.item_name;
                const existing = movieMap.get(name) || { name, minutes: 0, count: 0 };
                existing.minutes += minutes;
                existing.count += 1;
                movieMap.set(name, existing);
            } else if (itemType === 'episode') {
                totalEpisodes++;
                const showName = item.item_name.split(' - ')[0] || item.item_name;
                const existing = showMap.get(showName) || { name: showName, minutes: 0, count: 0 };
                existing.minutes += minutes;
                existing.count += 1;
                showMap.set(showName, existing);
            }
        }

        // Find peak month
        const peakMonth = monthlyMinutes.indexOf(Math.max(...monthlyMinutes));

        // Get top 5 shows with TMDB images (in parallel)
        const topShowsRaw = [...showMap.entries()]
            .sort((a, b) => b[1].minutes - a[1].minutes)
            .slice(0, 5);

        const topShows: TopItem[] = await Promise.all(topShowsRaw.map(async ([id, data]) => {
            const tmdbUrl = await tmdb.findPosterUrl(data.name, 'tv');
            return {
                id: id.toLowerCase().replace(/\s+/g, '_'),
                name: data.name,
                imageUrl: tmdbUrl || '',
                tmdbImageUrl: tmdbUrl || undefined,
                minutes: Math.round(data.minutes),
                count: data.count
            };
        }));

        // Get top 5 movies with TMDB images (in parallel)
        const topMoviesRaw = [...movieMap.entries()]
            .sort((a, b) => b[1].minutes - a[1].minutes)
            .slice(0, 5);

        const topMovies: TopItem[] = await Promise.all(topMoviesRaw.map(async ([id, data]) => {
            const tmdbUrl = await tmdb.findPosterUrl(data.name, 'movie');
            return {
                id: id.toLowerCase().replace(/\s+/g, '_'),
                name: data.name,
                imageUrl: tmdbUrl || '',
                tmdbImageUrl: tmdbUrl || undefined,
                minutes: Math.round(data.minutes),
                count: data.count
            };
        }));

        // Get top music items and fetch their details
        const topArtistsRaw = [...artistMap.entries()]
            .sort((a, b) => b[1].minutes - a[1].minutes)
            .slice(0, 5);

        const topTracksRaw = [...trackMap.values()]
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const musicItemIds = new Set<string>();
        topArtistsRaw.forEach(([_, stats]) => { if (stats.trackId) musicItemIds.add(stats.trackId); });
        topTracksRaw.forEach(stats => musicItemIds.add(stats.trackId));

        const musicItemDetails = new Map<string, EmbyItem>();
        if (musicItemIds.size > 0 && fetchUserId) {
            try {
                const items = await emby.getItems(fetchUserId, [...musicItemIds]);
                items.forEach(item => musicItemDetails.set(item.Id, item));
            } catch (e) {
                console.warn('Failed to fetch music item details for server stats:', e);
            }
        }

        // Finalize music stats
        const musicStats: MusicStats = {
            totalMinutes: musicTotalMinutes,
            trackCount: musicTrackCount,
            topArtists: topArtistsRaw.map(([name, stats]) => {
                const trackDetail = stats.trackId ? musicItemDetails.get(stats.trackId) : null;
                let imageUrl = '';
                if (trackDetail?.ArtistIds?.[0]) {
                    imageUrl = emby.getImageUrl(trackDetail.ArtistIds[0], 'Primary', 400);
                } else {
                    imageUrl = `${emby.getApiBaseUrl()}/Artists/${encodeURIComponent(name)}/Images/Primary?maxWidth=400&api_key=${emby.getApiKey()}`;
                }
                return { 
                    name, 
                    minutes: Math.round(stats.minutes), 
                    count: stats.count,
                    imageUrl 
                };
            }),
            topAlbums: [],
            topTracks: topTracksRaw.map(t => ({
                name: t.name,
                artist: t.artist,
                minutes: Math.round(t.minutes),
                count: t.count,
                imageUrl: emby.getImageUrl(t.trackId, 'Primary', 400)
            }))
        };

        const seerrRequests = await fetchSeerrRequestStats(timeRange);

        const stats: ServerStats = {
            totalUsers: users.length,
            totalMinutes,
            totalMovies,
            totalEpisodes,
            peakMonth,
            monthlyMinutes,
            topShows,
            topMovies,
            music: musicStats,
            seerrRequests,
            year: timeRange.year,
            timeRangeLabel: periodParam
        };

        // Cache the results
        cachedStatsMap.set(cacheKey, { stats, time: Date.now() });

        console.log(`Server stats for ${cacheKey} generated in ${Date.now() - startTime}ms`);

        return json(stats);
    } catch (e) {
        console.error('Error fetching server stats:', e);
        return json({ error: 'Failed to fetch server stats' }, { status: 500 });
    }
};
