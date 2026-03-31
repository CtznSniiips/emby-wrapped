import { json } from '@sveltejs/kit';
import { emby, type EmbyItem } from '$lib/server/emby';
import { tmdb } from '$lib/server/tmdb';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { parseTimeRange, timeRangeToString, calculateLookbackDays, matchesTimeRange, type TopItem, type MusicStats } from '$lib/server/stats';
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

async function fetchSeerrRequestStats(timeRange: ReturnType<typeof parseTimeRange>): Promise<ServerStats['seerrRequests']> {
    const seerrUrl = env.SEERR_URL?.trim();
    const seerrApiKey = env.SEERR_API_KEY?.trim();
    if (!seerrUrl || !seerrApiKey) return null;

    try {
        const normalizedUrl = seerrUrl.replace(/\/$/, '');
        const allRequests: SeerrRequest[] = [];
        let page = 1;
        let totalPages = 1;

        while (page <= totalPages) {
            const skip = (page - 1) * 100;
            const response = await fetch(`${normalizedUrl}/api/v1/request?skip=${skip}&take=100`, {
                headers: {
                    'X-Api-Key': seerrApiKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                console.warn(`Failed to fetch Seerr requests: ${response.status}`);
                return null;
            }

            const data: SeerrRequestsResponse = await response.json();
            const pageResults = data.results || [];
            allRequests.push(...pageResults);
            totalPages = Math.max(data.pageInfo?.pages || 1, 1);
            page++;
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

// Cache for server stats (expires after 5 minutes)
const cachedStatsMap = new Map<string, { stats: ServerStats; time: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export const GET: RequestHandler = async ({ url, cookies }) => {  // add cookies
    const session = getAuthSession(cookies);
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });
    
    try {
        const periodParam = url.searchParams.get('period') || String(new Date().getFullYear() - 1);
        const timeRange = parseTimeRange(periodParam);
        const timeRangeStr = timeRangeToString(timeRange);
        const cacheKey = timeRangeStr;

        // Return cached data if still valid
        const cached = cachedStatsMap.get(cacheKey);
        if (cached && Date.now() - cached.time < CACHE_TTL) {
            console.log(`Returning cached server stats for ${cacheKey}`);
            return json(cached.stats);
        }

        console.log(`Generating fresh server stats for ${cacheKey}...`);
        const startTime = Date.now();

        const users = await emby.getUsers();
        const daysToFetch = calculateLookbackDays(timeRange);
        
        const filterUserId = env.FILTER_USER_ID;

        // Collect all unique item IDs from all users
        const allItemIds = new Set<string>();
        const userActivities: { user: any, activity: any[] }[] = [];

        if (emby.useTracearrHistory) {
            const userMap = new Map(users.map((user) => [user.Id, user.Name]));
            const allTracearrActivity = await getAllTracearrPlaybackActivity({
                tracearrUrl: emby.tracearrUrl,
                tracearrApiKey: emby.tracearrApiKey,
                users: userMap,
                days: daysToFetch
            });

            for (const user of users) {
                const activity = allTracearrActivity.get(user.Id) ?? [];
                userActivities.push({ user, activity });
                activity.forEach((item) => {
                    if (matchesTimeRange(item.date, timeRange)) {
                        allItemIds.add(String(item.item_id));
                    }
                });
            }
        } else {
            // Fetch activities in parallel for Playback Reporting mode
            const BATCH_SIZE = 10;
            for (let i = 0; i < users.length; i += BATCH_SIZE) {
                const batch = users.slice(i, i + BATCH_SIZE);
                const batchResults = await Promise.allSettled(
                    batch.map(async (user) => {
                        try {
                            const activity = await emby.getUserPlaybackActivity(user.Id, daysToFetch);
                            return { user, activity };
                        } catch {
                            return null;
                        }
                    })
                );

                for (const result of batchResults) {
                    if (result.status === 'fulfilled' && result.value) {
                        userActivities.push(result.value);
                        result.value.activity.forEach(item => {
                            // Pre-filter by time range to reduce item fetch count
                            if (matchesTimeRange(item.date, timeRange)) {
                                allItemIds.add(String(item.item_id));
                            }
                        });
                    }
                }
            }
        }

        // Fetch item details using filter user (if set) or skip filtering
        // If FILTER_USER_ID is set, only items accessible to that user will be returned
        const itemDetails = new Map<string, EmbyItem>();
        const itemIdList = [...allItemIds];
        
        // Use filter user ID if provided, otherwise use the first admin user found (or just skip filtering logic if none)
        // Ideally we should use a specific user for filtering. If env.FILTER_USER_ID is not set, 
        // we might want to default to including everything (no filter) or pick an admin.
        // For server stats, usually we want to filter by a specific restricted user to avoid NSFW content.
        // If no filter user is provided, we fetch items using the first user (might be incomplete if that user has restrictions)
        // or better, fetch as admin. But here we stick to the requirement: apply FILTER_USER_ID.
        
        const fetchUserId = filterUserId || (users.find(u => u.Policy?.IsAdministrator)?.Id || users[0]?.Id);

        if (itemIdList.length > 0 && fetchUserId) {
            try {
                // Batch fetch items
                for (let i = 0; i < itemIdList.length; i += 50) {
                    const batch = itemIdList.slice(i, i + 50);
                    const items = await emby.getItems(fetchUserId, batch);
                    items.forEach(item => itemDetails.set(item.Id, item));
                }
            } catch (e) {
                console.warn('Failed to fetch item details for server stats:', e);
            }
        }

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

        for (const { activity } of userActivities) {
            for (const item of activity) {
                // Filter by time range
                if (!matchesTimeRange(item.date, timeRange)) continue;

                // Check permission / existence
                // If filterUserId is set, we strictly require the item to be found in itemDetails
                if (filterUserId && !item._fromTracearr && !itemDetails.has(String(item.item_id))) {
                    continue;
                }

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
