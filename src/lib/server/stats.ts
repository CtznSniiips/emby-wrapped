import { env } from '$env/dynamic/private';
import { emby, type PlaybackActivity, type EmbyItem } from './emby';

export interface TimeRange {
    type: 'year' | 'month';
    year: number;
    month?: number;  // 1-12, only for type 'month'
}

export function parseTimeRange(value: string): TimeRange {
    if (value.indexOf('-') !== -1) {
        // Supported month formats:
        // - "1-2026" / "01-2026" (preferred)
        // - "2026-01" (legacy)
        const parts = value.split('-');

        if (parts[0].length === 4) {
            // Legacy year-month format
            return { type: 'month', year: Number(parts[0]), month: Number(parts[1]) };
        }

        // Preferred month-year format
        return { type: 'month', year: Number(parts[1]), month: Number(parts[0]) };
    }
    // Format: "2025" (year)
    return { type: 'year', year: Number(value) };
}

export function formatTimeRangeLabel(range: TimeRange): string {
    if (range.type === 'month' && range.month) {
        return `${range.month}-${range.year}`;
    }
    return `${range.year}`;
}

export function timeRangeToString(range: TimeRange): string {
    if (range.type === 'month' && range.month) {
        return `${range.month}-${range.year}`;
    }
    return String(range.year);
}

export interface TopItem {
    id: string;
    name: string;
    imageUrl: string;
    tmdbImageUrl?: string;  // TMDB fallback
    minutes: number;
    count: number;
    // For shows
    episodes?: number;
    seriesId?: string;
}

export interface SeriesCompletionStat {
    id: string;
    name: string;
    imageUrl: string;
    watchedEpisodes: number;
    totalEpisodes: number;
    completionPercentage: number;
    minutes: number;
}

export interface GenreStat {
    name: string;
    minutes: number;
    percentage: number;
}

export interface DeviceClientStat {
    name: string;
    minutes: number;
    count: number;
    percentage: number;
}

export interface HeatmapData {
    hours: number[];   // 24 values (0-23)
    days: number[];    // 7 values (Sun-Sat)
    months: number[];  // 12 values (Jan-Dec)
}

export interface BingeSession {
    showName: string;
    showId: string;
    episodeCount: number;
    startTime: string;
    endTime: string;
    totalMinutes: number;
}

export interface MusicStats {
    totalMinutes: number;
    trackCount: number;
    topArtists: { name: string; minutes: number; count: number; imageUrl?: string }[];
    topAlbums: { name: string; artist: string; minutes: number; imageUrl?: string }[];
    topTracks: { name: string; artist: string; minutes: number; count: number; imageUrl?: string }[];
}

export interface FullMusicStats {
    userId: string;
    username: string;
    year: number;
    timeRange: string;
    timeRangeLabel: string;
    generatedAt: string;

    // Time stats
    totalMinutes: number;
    totalDays: number;
    uniqueTracks: number;
    totalPlays: number;

    // Top content
    topArtists: { name: string; minutes: number; count: number; percentage: number; imageUrl?: string }[];
    topTracks: { name: string; artist: string; minutes: number; count: number; imageUrl?: string }[];
    topAlbums: { name: string; artist: string; minutes: number; count: number; imageUrl?: string }[];

    // Temporal patterns
    heatmap: HeatmapData;
    peakHour: number;
    peakDay: number;
    peakMonth: number;

    // Listening personality
    isNightOwl: boolean;
    isEarlyBird: boolean;
    isWeekendWarrior: boolean;

    // First and last
    firstListen: { name: string; artist: string; date: string } | null;
    lastListen: { name: string; artist: string; date: string } | null;

    // Diversity
    artistDiversity: number;  // 0-1, higher = more diverse
}

export interface UserStats {
    userId: string;
    username: string;
    year: number;
    timeRange: string;  // e.g., "2025" or "1-2026"
    timeRangeLabel: string;  // e.g., "2025" or "1-2026"
    generatedAt: string;

    // Time stats
    totalMinutes: number;
    totalDays: number;

    // Content counts
    moviesWatched: number;
    episodesWatched: number;
    uniqueShows: number;
    uniqueMovies: number;

    // Top content
    topMovies: TopItem[];
    topShows: TopItem[];
    seriesCompletion: SeriesCompletionStat[];
    topGenres: GenreStat[];
    deviceClientBreakdown: DeviceClientStat[];
    totalGenresExplored: number;  // Total count before slicing to top 8

    // Temporal patterns
    heatmap: HeatmapData;
    peakHour: number;
    peakDay: number;
    peakMonth: number;

    // Viewing personality
    isNightOwl: boolean;   // Most viewing 9pm-3am
    isEarlyBird: boolean;  // Most viewing 5am-10am
    isWeekendWarrior: boolean; // Weekend > weekday viewing

    // Streaks and binges
    currentStreak: number;
    longestStreak: number;
    currentStreakStart: string | null;
    currentStreakEnd: string | null;
    longestStreakStart: string | null;
    longestStreakEnd: string | null;
    streakTimeZone: string;
    longestBinge: BingeSession | null;
    bingeCount: number;  // Number of 3+ episode sessions

    // First and last
    firstWatch: { id: string; name: string; date: string; type: string } | null;
    lastWatch: { id: string; name: string; date: string; type: string } | null;

    // Music (optional)
    music?: MusicStats;

    // Primary genre for personality (most watched)
    primaryGenre: string | null;
    primaryGenrePercentage: number;
    secondaryGenre: string | null;

    // Diversity and preference ratios
    genreDiversity: number;  // 0-1, higher = more diverse viewing
    movieToTvRatio: number;  // >1 = prefers movies, <1 = prefers TV
}

interface StreakStats {
    currentStreak: number;
    longestStreak: number;
    currentStreakStart: string | null;
    currentStreakEnd: string | null;
    longestStreakStart: string | null;
    longestStreakEnd: string | null;
}

/**
 * Parse datetime from date + time strings
 */
function parseDateTime(date: string, time: string): Date {
    const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})/);
    const timeMatch = time.match(/^(\d{2}):(\d{2})(?::(\d{2}))?/);

    // Parse date/time components directly to avoid timezone shifts from Date string parsing
    if (dateMatch && timeMatch) {
        const [, year, month, day] = dateMatch;
        const [, hour, minute, second = '0'] = timeMatch;
        return new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute),
            Number(second)
        );
    }

    // Fallback for unexpected formats
    return new Date(`${date}T${time}`);
}

function formatLocalDateTime(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function getDateParts(dateStr: string): { year: number; month: number } | null {
    const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        return {
            year: Number(dateMatch[1]),
            month: Number(dateMatch[2])
        };
    }

    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return null;

    return {
        year: parsed.getUTCFullYear(),
        month: parsed.getUTCMonth() + 1
    };
}

function getActiveDateKey(date: Date, timeZone: string): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });

    const parts = formatter.formatToParts(date);
    const year = parts.find((part) => part.type === 'year')?.value;
    const month = parts.find((part) => part.type === 'month')?.value;
    const day = parts.find((part) => part.type === 'day')?.value;

    if (!year || !month || !day) {
        throw new Error(`Unable to format active date key for timezone: ${timeZone}`);
    }

    return `${year}-${month}-${day}`;
}

function getAppTimeZone(): string {
    const configuredTimeZone = env.APP_TIMEZONE || env.TZ;

    if (configuredTimeZone) {
        try {
            Intl.DateTimeFormat('en-US', { timeZone: configuredTimeZone });
            return configuredTimeZone;
        } catch {
            console.warn(`Invalid timezone configured (${configuredTimeZone}), falling back to UTC`);
        }
    }

    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
        return 'UTC';
    }
}

function calculateStreakStats(activeDateKeys: Set<string>): StreakStats {
    if (activeDateKeys.size === 0) {
        return {
            currentStreak: 0,
            longestStreak: 0,
            currentStreakStart: null,
            currentStreakEnd: null,
            longestStreakStart: null,
            longestStreakEnd: null
        };
    }

    const sortedDateKeys = [...activeDateKeys].sort((a, b) => a.localeCompare(b));
    const dayNumbers = sortedDateKeys.map((dateKey) => {
        const [year, month, day] = dateKey.split('-').map(Number);
        return Math.floor(Date.UTC(year, month - 1, day) / (1000 * 60 * 60 * 24));
    });

    let longestStartIdx = 0;
    let longestEndIdx = 0;
    let runStartIdx = 0;

    for (let i = 1; i < dayNumbers.length; i++) {
        if (dayNumbers[i] !== dayNumbers[i - 1] + 1) {
            const currentRunLength = i - runStartIdx;
            const longestLength = longestEndIdx - longestStartIdx + 1;
            if (currentRunLength > longestLength) {
                longestStartIdx = runStartIdx;
                longestEndIdx = i - 1;
            }
            runStartIdx = i;
        }
    }

    const finalRunLength = dayNumbers.length - runStartIdx;
    const longestLength = longestEndIdx - longestStartIdx + 1;
    if (finalRunLength > longestLength) {
        longestStartIdx = runStartIdx;
        longestEndIdx = dayNumbers.length - 1;
    }

    let currentStartIdx = dayNumbers.length - 1;
    while (
        currentStartIdx > 0
        && dayNumbers[currentStartIdx] === dayNumbers[currentStartIdx - 1] + 1
    ) {
        currentStartIdx -= 1;
    }

    return {
        currentStreak: dayNumbers.length - currentStartIdx,
        longestStreak: longestEndIdx - longestStartIdx + 1,
        currentStreakStart: sortedDateKeys[currentStartIdx],
        currentStreakEnd: sortedDateKeys[dayNumbers.length - 1],
        longestStreakStart: sortedDateKeys[longestStartIdx],
        longestStreakEnd: sortedDateKeys[longestEndIdx]
    };
}

/**
 * Check if a date matches the given time range
 */
export function matchesTimeRange(dateStr: string, range: TimeRange): boolean {
    const dateParts = getDateParts(dateStr);
    if (!dateParts) return false;

    if (range.type === 'year') {
        return dateParts.year === range.year;
    }
    // Month: check both year and month
    return dateParts.year === range.year && dateParts.month === range.month;
}

/**
 * Generate available time range options based on current date
 */
export function getAvailableTimeRanges(): { value: string; label: string }[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    const options: { value: string; label: string }[] = [];

    // Add previous year
    options.push({ value: String(currentYear - 1), label: `${currentYear - 1}` });

    // Add current year (full year-to-date)
    options.push({ value: String(currentYear), label: `${currentYear}` });

    // Add months of current year (strictly before current month)
    for (let month = 1; month < currentMonth; month++) {
        const monthStr = month < 10 ? '0' + month : String(month);
        options.push({
            value: `${monthStr}-${currentYear}`,
            label: `${month}-${currentYear}`
        });
    }

    // Reverse to show newest first
    return options.reverse();
}

/**
 * Calculate how many days back we need to fetch to cover the requested time range
 */
export function calculateLookbackDays(range: TimeRange): number {
    const now = new Date();
    const targetStart = range.type === 'month' && range.month
        ? new Date(range.year, range.month - 1, 1) // First day of requested month
        : new Date(range.year, 0, 1); // Jan 1st of requested year

    // If target is in the future (manual URL edits), fetch a minimal safe window
    if (targetStart > now) return 31;

    // Calculate difference in days and add a small buffer for timezone/plugin boundaries
    const diffTime = now.getTime() - targetStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Avoid over-fetching large windows for current-year/month (can skew capped plugin results)
    return Math.max(31, diffDays + 14);
}


function normalizeDeviceClient(activity: PlaybackActivity): string {
    const isUnknownValue = (value: string): boolean => {
        const normalized = value.trim().toLowerCase();
        return normalized.length === 0
            || normalized === 'unknown'
            || normalized === 'unknown client'
            || normalized === 'unknown device'
            || normalized === 'n/a'
            || normalized === 'na'
            || normalized === '-';
    };

    const rawCandidates = [
        activity.device_name,
        activity.device,
        activity.client_name,
        activity.client,
        activity.app_name,
        activity.app
    ];

    const raw = rawCandidates.find((value) => typeof value === 'string' && !isUnknownValue(value))?.trim();
    if (!raw) return 'Unknown Client';

    const lower = raw.toLowerCase();
    if (lower.includes('android tv') || lower.includes('fire tv') || lower.includes('roku') || lower.includes('tizen') || lower.includes('webos') || lower.includes('appletv') || lower.includes('apple tv') || lower.includes('smart tv')) {
        return 'TV App';
    }
    if (lower.includes('android') || lower.includes('iphone') || lower.includes('ipad') || lower.includes('ios') || lower.includes('mobile')) {
        return 'Mobile App';
    }
    if (lower.includes('chrome') || lower.includes('firefox') || lower.includes('safari') || lower.includes('edge') || lower.includes('browser') || lower.includes('web')) {
        return 'Web Browser';
    }
    if (lower.includes('emby theater') || lower.includes('desktop') || lower.includes('windows') || lower.includes('mac') || lower.includes('linux')) {
        return 'Desktop App';
    }

    return raw;
}

/**
 * Aggregate playback data into user stats
 */
export async function aggregateUserStats(userId: string, username: string, timeRange: TimeRange | number = new Date().getFullYear() - 1): Promise<UserStats> {
    // Convert legacy year number to TimeRange
    const range: TimeRange = typeof timeRange === 'number'
        ? { type: 'year', year: timeRange }
        : timeRange;

    // Calculate how many days to fetch based on the time range
    // If requesting a previous year, we need to go back further than 365 days
    const daysToFetch = calculateLookbackDays(range);

    // Fetch user playback activity
    const allActivity = await emby.getUserPlaybackActivity(userId, daysToFetch);

    // Separate video and audio content
    const videoActivity = allActivity.filter(a => {
        if (!matchesTimeRange(a.date, range)) return false;
        const itemType = a.item_type.toLowerCase();
        // Exclude music and audio from video stats
        return itemType !== 'audio' && itemType !== 'musicvideo';
    });

    const audioActivity = allActivity.filter(a => {
        if (!matchesTimeRange(a.date, range)) return false;
        const itemType = a.item_type.toLowerCase();
        return itemType === 'audio';
    });

    // Collect all unique item IDs we need to fetch details for
    const allItemIds = new Set<string>();
    videoActivity.forEach(a => allItemIds.add(String(a.item_id)));

    // Use FILTER_USER_ID if set, otherwise use the requesting user's ID
    // This allows filtering out NSFW content by using a restricted user's permissions
    const filterUserId = env.FILTER_USER_ID || userId;

    // Fetch item details for ALL items (for correct images)
    // Items the filter user doesn't have permission to access will not be returned
    const itemDetails = new Map<string, EmbyItem>();
    const itemIdList = [...allItemIds];

    try {
        // Batch fetch items in chunks of 50.
        // IMPORTANT: fetch all unique IDs for the selected range.
        // Capping this list truncates older activity (often January in yearly views),
        // which makes totals and monthly stats inconsistent with month-only selections.
        for (let i = 0; i < itemIdList.length; i += 50) {
            const batch = itemIdList.slice(i, i + 50);
            const items = await emby.getItems(filterUserId, batch);
            items.forEach(item => itemDetails.set(item.Id, item));
        }
    } catch (e) {
        console.warn('Failed to fetch item details:', e);
    }

    // Filter video activity to only include items the filter user has permission to access
    const accessibleVideoActivity = videoActivity.filter(a => itemDetails.has(String(a.item_id)));
    const streakTimeZone = getAppTimeZone();

    // Build de-duplicated active dates from timestamped playback events.
    const activeDateKeys = new Set(
        accessibleVideoActivity.map((activity) => getActiveDateKey(parseDateTime(activity.date, activity.time), streakTimeZone))
    );
    const streakStats = calculateStreakStats(activeDateKeys);

    // Calculate total time (duration is in seconds) - only for accessible items
    const totalMinutes = Math.round(accessibleVideoActivity.reduce((sum, a) => sum + parseInt(a.duration || '0', 10), 0) / 60);
    const totalDays = Math.round(totalMinutes / 1440 * 100) / 100;

    // Count by type - only for accessible items
    const movies = accessibleVideoActivity.filter(a => a.item_type.toLowerCase() === 'movie');
    const episodes = accessibleVideoActivity.filter(a => a.item_type.toLowerCase() === 'episode');

    // Get unique items
    const uniqueMovieIds = new Set(movies.map(m => String(m.item_id)));
    const uniqueShowIds = new Set<string>();

    // Aggregate by item for top lists
    const movieStats = new Map<string, { minutes: number; count: number; name: string }>();
    const showStats = new Map<string, { minutes: number; count: number; name: string; episodes: Set<string>; seriesId?: string }>();
    const genreMinutes = new Map<string, number>();

    // Process each activity - only accessible items
    for (const activity of accessibleVideoActivity) {
        const itemId = String(activity.item_id);
        const item = itemDetails.get(itemId)!;

        const minutes = parseInt(activity.duration || '0', 10) / 60;
        const itemType = activity.item_type.toLowerCase();

        if (itemType === 'movie') {
            const existing = movieStats.get(itemId) || { minutes: 0, count: 0, name: activity.item_name };
            existing.minutes += minutes;
            existing.count += 1;
            movieStats.set(itemId, existing);

            // Genres
            if (item?.Genres) {
                for (const genre of item.Genres) {
                    genreMinutes.set(genre, (genreMinutes.get(genre) || 0) + minutes);
                }
            }
        } else if (itemType === 'episode') {
            // Extract show name from "Show Name - sXXeXX - Episode Title" format
            const showName = activity.item_name.split(' - ')[0] || activity.item_name;
            const showId = item?.SeriesId || showName.toLowerCase().replace(/\s+/g, '_');
            uniqueShowIds.add(showId);

            const existing = showStats.get(showId) || {
                minutes: 0,
                count: 0,
                name: item?.SeriesName || showName,
                episodes: new Set(),
                seriesId: item?.SeriesId
            };
            existing.minutes += minutes;
            existing.count += 1;
            existing.episodes.add(itemId);
            // Update seriesId if we find it
            if (item?.SeriesId && !existing.seriesId) {
                existing.seriesId = item.SeriesId;
            }
            showStats.set(showId, existing);

            // Genres from show
            if (item?.Genres) {
                for (const genre of item.Genres) {
                    genreMinutes.set(genre, (genreMinutes.get(genre) || 0) + minutes);
                }
            }
        }
    }

    // Build top movies list - SORTED BY MINUTES (time watched), not play count
    const topMovies: TopItem[] = [...movieStats.entries()]
        .sort((a, b) => b[1].minutes - a[1].minutes)
        .slice(0, 10)
        .map(([id, stats]) => ({
            id,
            name: stats.name,
            imageUrl: emby.getImageUrl(id, 'Primary', 400),
            minutes: Math.round(stats.minutes),
            count: stats.count
        }));

    // Build top shows list - use SeriesId for image
    const topShows: TopItem[] = [...showStats.entries()]
        .sort((a, b) => b[1].minutes - a[1].minutes)
        .slice(0, 10)
        .map(([id, stats]) => {
            // Use the stored seriesId if available, otherwise try to find one
            let imageId = stats.seriesId;
            if (!imageId) {
                // Try to find a real series ID from item details
                const episodeWithSeriesId = [...itemDetails.values()].find(
                    item => (item.SeriesName === stats.name || item.SeriesId === id) && item.SeriesId
                );
                imageId = episodeWithSeriesId?.SeriesId || id;
            }

            return {
                id,
                name: stats.name,
                imageUrl: emby.getImageUrl(imageId, 'Primary', 400),
                minutes: Math.round(stats.minutes),
                count: stats.count,
                episodes: stats.episodes.size,
                seriesId: imageId
            };
        });



    const minSeriesEpisodes = 5;
    const seriesCompletionCandidates = [...showStats.values()]
        .filter((stats) => !!stats.seriesId)
        .map((stats) => ({
            id: stats.seriesId!,
            name: stats.name,
            watchedEpisodes: stats.episodes.size,
            minutes: Math.round(stats.minutes)
        }));

    const seriesEpisodeTotals = new Map<string, number>();
    await Promise.all(seriesCompletionCandidates.map(async (series) => {
        if (seriesEpisodeTotals.has(series.id)) return;
        try {
            const total = await emby.getSeriesEpisodeCount(filterUserId, series.id);
            seriesEpisodeTotals.set(series.id, total);
        } catch {
            seriesEpisodeTotals.set(series.id, 0);
        }
    }));

    const seriesCompletion: SeriesCompletionStat[] = seriesCompletionCandidates
        .map((series) => {
            const totalEpisodes = seriesEpisodeTotals.get(series.id) || 0;
            const completionPercentage = totalEpisodes > 0
                ? Math.min(100, Math.round((series.watchedEpisodes / totalEpisodes) * 100))
                : 0;

            return {
                id: series.id,
                name: series.name,
                imageUrl: emby.getImageUrl(series.id, 'Primary', 400),
                watchedEpisodes: series.watchedEpisodes,
                totalEpisodes,
                completionPercentage,
                minutes: series.minutes
            };
        })
        .filter((series) => series.totalEpisodes >= minSeriesEpisodes)
        .sort((a, b) => {
            if (b.completionPercentage !== a.completionPercentage) {
                return b.completionPercentage - a.completionPercentage;
            }
            return b.watchedEpisodes - a.watchedEpisodes;
        });

    // Build genre stats - show AT LEAST 5 genres (topGenres is for display, totalGenresExplored is for stats)
    const totalGenresExplored = genreMinutes.size;
    const totalGenreMinutes = [...genreMinutes.values()].reduce((a, b) => a + b, 0) || 1;
    const topGenres: GenreStat[] = [...genreMinutes.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, Math.max(5, Math.min(8, genreMinutes.size)))  // At least 5, up to 8
        .map(([name, minutes]) => ({
            name,
            minutes: Math.round(minutes),
            percentage: Math.round((minutes / totalGenreMinutes) * 100)
        }));

    const deviceClientMinutes = new Map<string, { minutes: number; count: number }>();
    for (const activity of accessibleVideoActivity) {
        const deviceClient = normalizeDeviceClient(activity);
        const minutes = parseInt(activity.duration || '0', 10) / 60;
        const existing = deviceClientMinutes.get(deviceClient) || { minutes: 0, count: 0 };
        existing.minutes += minutes;
        existing.count += 1;
        deviceClientMinutes.set(deviceClient, existing);
    }

    const totalDeviceClientMinutes = [...deviceClientMinutes.values()].reduce((sum, entry) => sum + entry.minutes, 0) || 1;
    const deviceClientBreakdown = [...deviceClientMinutes.entries()]
        .sort((a, b) => b[1].minutes - a[1].minutes)
        .slice(0, 6)
        .map(([name, stats]) => ({
            name,
            minutes: Math.round(stats.minutes),
            count: stats.count,
            percentage: Math.round((stats.minutes / totalDeviceClientMinutes) * 100)
        }));

    // Calculate heatmaps - only for accessible items
    const hours = new Array(24).fill(0);
    const days = new Array(7).fill(0);
    const months = new Array(12).fill(0);

    for (const activity of accessibleVideoActivity) {
        const date = parseDateTime(activity.date, activity.time);
        const minutes = parseInt(activity.duration || '0', 10) / 60;

        hours[date.getHours()] += minutes;
        days[date.getDay()] += minutes;
        months[date.getMonth()] += minutes;
    }

    // Find peaks
    const peakHour = hours.indexOf(Math.max(...hours));
    const peakDay = days.indexOf(Math.max(...days));
    const peakMonth = months.indexOf(Math.max(...months));

    // Viewing personality
    const nightMinutes = hours.slice(21, 24).reduce((a, b) => a + b, 0) + hours.slice(0, 3).reduce((a, b) => a + b, 0);
    const morningMinutes = hours.slice(5, 10).reduce((a, b) => a + b, 0);
    const weekendMinutes = days[0] + days[6];
    const weekdayMinutes = days.slice(1, 6).reduce((a, b) => a + b, 0);

    const isNightOwl = totalMinutes > 0 && nightMinutes > totalMinutes * 0.3;
    const isEarlyBird = totalMinutes > 0 && morningMinutes > totalMinutes * 0.25;
    const isWeekendWarrior = weekdayMinutes > 0 && weekendMinutes > weekdayMinutes * (2 / 5) * 1.5;

    // Detect binge sessions - group consecutive same-show episodes into contiguous sessions.
    // A binge is 3+ UNIQUE episodes of the SAME show watched in a single session.

    // First, group all episodes by date and show
    const episodesByDateAndShow = new Map<string, PlaybackActivity[]>();

    for (const ep of episodes) {
        const showName = ep.item_name.split(' - ')[0] || ep.item_name;
        const showId = showName.toLowerCase().replace(/\s+/g, '_');
        const dateKey = `${ep.date}|${showId}`;

        if (!episodesByDateAndShow.has(dateKey)) {
            episodesByDateAndShow.set(dateKey, []);
        }
        episodesByDateAndShow.get(dateKey)!.push(ep);
    }

    const bingeSessions: BingeSession[] = [];

    for (const [key, eps] of episodesByDateAndShow.entries()) {
        const showId = key.split('|')[1];
        const showName = eps[0].item_name.split(' - ')[0] || eps[0].item_name;

        // Get unique episodes by item_id (same episode watched multiple times doesn't count)
        const uniqueEpisodes = [...new Map(eps.map(e => [e.item_id, e])).values()];

        // Need at least 3 unique episodes to be a binge
        if (uniqueEpisodes.length < 3) continue;

        // Sort by time
        uniqueEpisodes.sort((a, b) => {
            const timeA = parseDateTime(a.date, a.time).getTime();
            const timeB = parseDateTime(b.date, b.time).getTime();
            return timeA - timeB;
        });

        // Split into contiguous sessions to avoid counting long breaks as one sitting
        const maxBreakMinutes = 90;
        const sessions: PlaybackActivity[][] = [];
        let currentSession: PlaybackActivity[] = [];

        for (const episode of uniqueEpisodes) {
            if (currentSession.length === 0) {
                currentSession.push(episode);
                continue;
            }

            const previousEpisode = currentSession[currentSession.length - 1];
            const previousStart = parseDateTime(previousEpisode.date, previousEpisode.time);
            const previousDurationSeconds = parseInt(previousEpisode.duration || '0', 10);
            const previousEnd = new Date(previousStart.getTime() + (previousDurationSeconds * 1000));
            const currentStart = parseDateTime(episode.date, episode.time);

            const breakMinutes = (currentStart.getTime() - previousEnd.getTime()) / (1000 * 60);

            if (breakMinutes <= maxBreakMinutes) {
                currentSession.push(episode);
            } else {
                sessions.push(currentSession);
                currentSession = [episode];
            }
        }

        if (currentSession.length > 0) {
            sessions.push(currentSession);
        }

        for (const sessionEpisodes of sessions) {
            // Need at least 3 episodes per contiguous session to be a binge
            if (sessionEpisodes.length < 3) continue;

            const totalSeconds = sessionEpisodes.reduce((sum, e) => sum + parseInt(e.duration || '0', 10), 0);
            const totalMinutes = Math.round(totalSeconds / 60);

            // Sanity check: average at least 10 minutes per episode (shortest episodes are ~10-15 min)
            const avgMinutesPerEp = totalMinutes / sessionEpisodes.length;
            if (avgMinutesPerEp < 10) continue;

            const firstEp = sessionEpisodes[0];
            const lastEp = sessionEpisodes[sessionEpisodes.length - 1];
            const lastEpStart = parseDateTime(lastEp.date, lastEp.time);
            const lastEpDurationSeconds = parseInt(lastEp.duration || '0', 10);
            const lastEpEnd = new Date(lastEpStart.getTime() + (lastEpDurationSeconds * 1000));

            bingeSessions.push({
                showName,
                showId,
                episodeCount: sessionEpisodes.length,
                startTime: `${firstEp.date}T${firstEp.time}`,
                endTime: formatLocalDateTime(lastEpEnd),
                totalMinutes
            });
        }
    }

    // Find longest binge by episode count, with sanity check
    const longestBinge = bingeSessions.length > 0
        ? bingeSessions
            .filter(b => b.episodeCount <= 20)  // Max 20 episodes in one session (sanity cap)
            .sort((a, b) => b.episodeCount - a.episodeCount)[0] || null
        : null;

    // First and last watch - only for accessible items
    const sortedActivity = [...accessibleVideoActivity].sort((a, b) => {
        const dateA = parseDateTime(a.date, a.time);
        const dateB = parseDateTime(b.date, b.time);
        return dateA.getTime() - dateB.getTime();
    });

    const firstWatch = sortedActivity.length > 0 ? {
        id: String(sortedActivity[0].item_id),
        name: sortedActivity[0].item_name,
        date: sortedActivity[0].date,
        type: sortedActivity[0].item_type
    } : null;

    const lastWatch = sortedActivity.length > 0 ? {
        id: String(sortedActivity[sortedActivity.length - 1].item_id),
        name: sortedActivity[sortedActivity.length - 1].item_name,
        date: sortedActivity[sortedActivity.length - 1].date,
        type: sortedActivity[sortedActivity.length - 1].item_type
    } : null;

    // Process music stats if available
    let musicStats: MusicStats | undefined;
    if (audioActivity.length > 0) {
        const musicMinutes = Math.round(audioActivity.reduce((sum, a) => sum + parseInt(a.duration || '0', 10), 0) / 60);

        // Aggregate by artist (extracted from item name patterns)
        const artistMinutes = new Map<string, { minutes: number; count: number; trackId?: string }>();
        const trackStats = new Map<string, { name: string; artist: string; minutes: number; count: number; trackId: string }>();

        for (const track of audioActivity) {
            // Try to extract artist from "Artist - Song" format
            const parts = track.item_name.split(' - ');
            const artist = parts.length > 1 ? parts[0].trim() : 'Unknown Artist';
            const trackName = parts.length > 1 ? parts.slice(1).join(' - ').trim() : track.item_name;
            const minutes = parseInt(track.duration || '0', 10) / 60;
            const trackId = String(track.item_id);

            // Artist stats
            const existingArtist = artistMinutes.get(artist) || { minutes: 0, count: 0, trackId };
            existingArtist.minutes += minutes;
            existingArtist.count += 1;
            if (!existingArtist.trackId) existingArtist.trackId = trackId;
            artistMinutes.set(artist, existingArtist);

            // Track stats
            const trackKey = `${artist}|||${trackName}`;
            const existingTrack = trackStats.get(trackKey) || { name: trackName, artist, minutes: 0, count: 0, trackId };
            existingTrack.minutes += minutes;
            existingTrack.count += 1;
            trackStats.set(trackKey, existingTrack);
        }

        // Fetch details for top items to get images and artist IDs
        const topArtistsData = [...artistMinutes.entries()]
            .sort((a, b) => b[1].minutes - a[1].minutes)
            .slice(0, 5);
        
        const topTracksData = [...trackStats.values()]
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        const musicItemIds = new Set<string>();
        topArtistsData.forEach(([_, stats]) => { if (stats.trackId) musicItemIds.add(stats.trackId); });
        topTracksData.forEach(stats => musicItemIds.add(stats.trackId));

        const musicItemDetails = new Map<string, EmbyItem>();
        try {
            if (musicItemIds.size > 0) {
                const items = await emby.getItems(filterUserId, [...musicItemIds]);
                items.forEach(item => musicItemDetails.set(item.Id, item));
            }
        } catch (e) {
            console.warn('Failed to fetch music item details:', e);
        }

        const topArtists = topArtistsData.map(([name, stats]) => {
            const trackDetail = stats.trackId ? musicItemDetails.get(stats.trackId) : null;
            let imageUrl = '';
            if (trackDetail?.ArtistIds?.[0]) {
                imageUrl = emby.getImageUrl(trackDetail.ArtistIds[0], 'Primary', 400);
            } else {
                // Try fetching by Artist Name as fallback (common in some Emby clients)
                imageUrl = `${emby.getApiBaseUrl()}/Artists/${encodeURIComponent(name)}/Images/Primary?maxWidth=400&api_key=${emby.getApiKey()}`;
            }
            return { 
                name, 
                minutes: Math.round(stats.minutes), 
                count: stats.count,
                imageUrl: imageUrl ? imageUrl.replace('maxWidth=200', 'maxWidth=400') : ''
            };
        });

        const topTracks = topTracksData.map(t => {
            return { 
                ...t, 
                minutes: Math.round(t.minutes),
                imageUrl: emby.getImageUrl(t.trackId, 'Primary', 400)
            };
        });

        musicStats = {
            totalMinutes: musicMinutes,
            trackCount: audioActivity.length,
            topArtists,
            topAlbums: [], // Would need more complex parsing
            topTracks
        };
    }

    return {
        userId,
        username,
        year: range.year,
        timeRange: timeRangeToString(range),
        timeRangeLabel: formatTimeRangeLabel(range),
        generatedAt: new Date().toISOString(),
        totalMinutes,
        totalDays,
        moviesWatched: uniqueMovieIds.size,
        episodesWatched: episodes.length,
        uniqueShows: uniqueShowIds.size,
        uniqueMovies: uniqueMovieIds.size,
        topMovies,
        topShows,
        seriesCompletion,
        topGenres,
        deviceClientBreakdown,
        totalGenresExplored,
        heatmap: {
            hours: hours.map(h => Math.round(h)),
            days: days.map(d => Math.round(d)),
            months: months.map(m => Math.round(m))
        },
        peakHour,
        peakDay,
        peakMonth,
        isNightOwl,
        isEarlyBird,
        isWeekendWarrior,
        currentStreak: streakStats.currentStreak,
        longestStreak: streakStats.longestStreak,
        currentStreakStart: streakStats.currentStreakStart,
        currentStreakEnd: streakStats.currentStreakEnd,
        longestStreakStart: streakStats.longestStreakStart,
        longestStreakEnd: streakStats.longestStreakEnd,
        streakTimeZone,
        longestBinge,
        bingeCount: bingeSessions.length,
        firstWatch,
        lastWatch,
        music: musicStats,
        primaryGenre: topGenres.length > 0 ? topGenres[0].name : null,
        primaryGenrePercentage: topGenres.length > 0 ? topGenres[0].percentage : 0,
        secondaryGenre: topGenres.length > 1 ? topGenres[1].name : null,
        // Genre diversity: 1 - (concentration). High if viewing spread across many genres
        genreDiversity: topGenres.length > 0
            ? 1 - (topGenres.reduce((sum, g) => sum + Math.pow(g.percentage / 100, 2), 0))
            : 0,
        // Movie to TV ratio: minutes in movies vs episodes
        movieToTvRatio: episodes.length > 0
            ? (movies.reduce((sum, m) => sum + parseInt(m.duration || '0', 10), 0) / 60) /
            Math.max(1, episodes.reduce((sum, e) => sum + parseInt(e.duration || '0', 10), 0) / 60)
            : uniqueMovieIds.size > 0 ? 10 : 0  // Movie-only viewer
    };
}

/**
 * Aggregate music playback data into full music stats
 */
export async function aggregateMusicStats(userId: string, username: string, timeRange: TimeRange | number = new Date().getFullYear() - 1): Promise<FullMusicStats> {
    // Convert legacy year number to TimeRange
    const range: TimeRange = typeof timeRange === 'number'
        ? { type: 'year', year: timeRange }
        : timeRange;

    // Calculate how many days to fetch based on the time range
    const daysToFetch = calculateLookbackDays(range);

    // Fetch user playback activity
    const allActivity = await emby.getUserPlaybackActivity(userId, daysToFetch);

    // Filter audio content only
    const audioActivity = allActivity.filter(a => {
        if (!matchesTimeRange(a.date, range)) return false;
        const itemType = a.item_type.toLowerCase();
        return itemType === 'audio';
    });

    // Calculate total time
    const totalMinutes = Math.round(audioActivity.reduce((sum, a) => sum + parseInt(a.duration || '0', 10), 0) / 60);
    const totalDays = Math.round(totalMinutes / 1440 * 100) / 100;

    // Track unique tracks and aggregate stats
    const trackStats = new Map<string, { name: string; artist: string; minutes: number; count: number; trackId: string }>();
    const artistStats = new Map<string, { minutes: number; count: number; trackId?: string }>();
    const albumStats = new Map<string, { name: string; artist: string; minutes: number; count: number; trackId: string }>();

    for (const track of audioActivity) {
        const parts = track.item_name.split(' - ');
        const artist = parts.length > 1 ? parts[0].trim() : 'Unknown Artist';
        const trackName = parts.length > 1 ? parts.slice(1).join(' - ').trim() : track.item_name;
        const minutes = parseInt(track.duration || '0', 10) / 60;
        const trackId = String(track.item_id);
        const trackKey = `${artist}|||${trackName}`;

        // Track stats
        const existingTrack = trackStats.get(trackKey) || { name: trackName, artist, minutes: 0, count: 0, trackId };
        existingTrack.minutes += minutes;
        existingTrack.count += 1;
        trackStats.set(trackKey, existingTrack);

        // Artist stats
        const existingArtist = artistStats.get(artist) || { minutes: 0, count: 0, trackId };
        existingArtist.minutes += minutes;
        existingArtist.count += 1;
        if (!existingArtist.trackId) existingArtist.trackId = trackId;
        artistStats.set(artist, existingArtist);
    }

    // Fetch details for top items to get images and artist IDs
    const topArtistsData = [...artistStats.entries()]
        .sort((a, b) => b[1].minutes - a[1].minutes)
        .slice(0, 10);
    
    const topTracksData = [...trackStats.values()]
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 10);

    const musicItemIds = new Set<string>();
    topArtistsData.forEach(([_, stats]) => { if (stats.trackId) musicItemIds.add(stats.trackId); });
    topTracksData.forEach(stats => musicItemIds.add(stats.trackId));

    const musicItemDetails = new Map<string, EmbyItem>();
    const filterUserId = env.FILTER_USER_ID || userId;
    try {
        if (musicItemIds.size > 0) {
            const items = await emby.getItems(filterUserId, [...musicItemIds]);
            items.forEach(item => musicItemDetails.set(item.Id, item));
        }
    } catch (e) {
        console.warn('Failed to fetch music item details:', e);
    }

    // Build top lists
    const totalArtistMinutes = [...artistStats.values()].reduce((sum, a) => sum + a.minutes, 0) || 1;

    const topArtists = topArtistsData.map(([name, stats]) => {
        const trackDetail = stats.trackId ? musicItemDetails.get(stats.trackId) : null;
        let imageUrl = '';
        if (trackDetail?.ArtistIds?.[0]) {
            imageUrl = emby.getImageUrl(trackDetail.ArtistIds[0], 'Primary', 400);
        } else {
            // Try fetching by Artist Name as fallback
            imageUrl = `${emby.getApiBaseUrl()}/Artists/${encodeURIComponent(name)}/Images/Primary?maxWidth=400&api_key=${emby.getApiKey()}`;
        }
        return {
            name,
            minutes: Math.round(stats.minutes),
            count: stats.count,
            percentage: Math.round((stats.minutes / totalArtistMinutes) * 100),
            imageUrl: imageUrl ? imageUrl.replace('maxWidth=200', 'maxWidth=400') : ''
        };
    });

    const topTracks = topTracksData.map(t => ({
        name: t.name,
        artist: t.artist,
        minutes: Math.round(t.minutes),
        count: t.count,
        imageUrl: emby.getImageUrl(t.trackId, 'Primary', 400)
    }));

    const topAlbums = [...albumStats.values()]
        .sort((a, b) => b.minutes - a.minutes)
        .slice(0, 10)
        .map(a => ({
            name: a.name,
            artist: a.artist,
            minutes: Math.round(a.minutes),
            count: a.count
        }));

    // Calculate heatmaps
    const hours = new Array(24).fill(0);
    const days = new Array(7).fill(0);
    const months = new Array(12).fill(0);

    for (const track of audioActivity) {
        const date = parseDateTime(track.date, track.time);
        const minutes = parseInt(track.duration || '0', 10) / 60;

        hours[date.getHours()] += minutes;
        days[date.getDay()] += minutes;
        months[date.getMonth()] += minutes;
    }

    // Find peaks
    const peakHour = hours.indexOf(Math.max(...hours));
    const peakDay = days.indexOf(Math.max(...days));
    const peakMonth = months.indexOf(Math.max(...months));

    // Listening personality
    const nightMinutes = hours.slice(21, 24).reduce((a, b) => a + b, 0) + hours.slice(0, 3).reduce((a, b) => a + b, 0);
    const morningMinutes = hours.slice(5, 10).reduce((a, b) => a + b, 0);
    const weekendMinutes = days[0] + days[6];
    const weekdayMinutes = days.slice(1, 6).reduce((a, b) => a + b, 0);

    const isNightOwl = totalMinutes > 0 && nightMinutes > totalMinutes * 0.3;
    const isEarlyBird = totalMinutes > 0 && morningMinutes > totalMinutes * 0.25;
    const isWeekendWarrior = weekdayMinutes > 0 && weekendMinutes > weekdayMinutes * (2 / 5) * 1.5;

    // First and last listen
    const sortedActivity = [...audioActivity].sort((a, b) => {
        const dateA = parseDateTime(a.date, a.time);
        const dateB = parseDateTime(b.date, b.time);
        return dateA.getTime() - dateB.getTime();
    });

    const parseTrackInfo = (item: typeof audioActivity[0]) => {
        const parts = item.item_name.split(' - ');
        return {
            artist: parts.length > 1 ? parts[0].trim() : 'Unknown Artist',
            name: parts.length > 1 ? parts.slice(1).join(' - ').trim() : item.item_name,
            date: item.date
        };
    };

    const firstListen = sortedActivity.length > 0 ? parseTrackInfo(sortedActivity[0]) : null;
    const lastListen = sortedActivity.length > 0 ? parseTrackInfo(sortedActivity[sortedActivity.length - 1]) : null;

    // Artist diversity
    const artistDiversity = topArtists.length > 0
        ? 1 - (topArtists.reduce((sum, a) => sum + Math.pow(a.percentage / 100, 2), 0))
        : 0;

    return {
        userId,
        username,
        year: range.year,
        timeRange: timeRangeToString(range),
        timeRangeLabel: formatTimeRangeLabel(range),
        generatedAt: new Date().toISOString(),
        totalMinutes,
        totalDays,
        uniqueTracks: trackStats.size,
        totalPlays: audioActivity.length,
        topArtists,
        topTracks,
        topAlbums,
        heatmap: {
            hours: hours.map(h => Math.round(h)),
            days: days.map(d => Math.round(d)),
            months: months.map(m => Math.round(m))
        },
        peakHour,
        peakDay,
        peakMonth,
        isNightOwl,
        isEarlyBird,
        isWeekendWarrior,
        firstListen,
        lastListen,
        artistDiversity
    };
}
