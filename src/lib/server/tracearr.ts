import { env } from '$env/dynamic/private';

export interface TracearrPlaybackActivity {
    date: string;
    time: string;
    user_id: string;
    item_name: string;
    item_id: number | string;
    item_type: string;
    duration: string;
    remote_address?: string;
    user_name: string;
    user_has_image?: boolean;
    client?: string;
    client_name?: string;
    device?: string;
    device_name?: string;
    app?: string;
    app_name?: string;
    _fromTracearr?: boolean;
    [key: string]: string | number | boolean | undefined;
}

type TracearrRecord = Record<string, unknown>;

function readTracearrValue(record: TracearrRecord, path: string): unknown {
    if (Object.prototype.hasOwnProperty.call(record, path)) {
        return record[path];
    }

    const parts = path.split('.');
    let current: unknown = record;
    for (const part of parts) {
        if (!current || typeof current !== 'object') {
            return undefined;
        }
        current = (current as Record<string, unknown>)[part];
    }
    return current;
}

function readTracearrString(record: TracearrRecord, keys: string[]): string {
    for (const key of keys) {
        const value = readTracearrValue(record, key);
        if (value === undefined || value === null) continue;
        const str = String(value).trim();
        if (str.length > 0) return str;
    }
    return '';
}

function readTracearrNumber(record: TracearrRecord, keys: string[]): number {
    const raw = readTracearrString(record, keys);
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
}

function pseudoItemId(name: string, startedAt: string): number {
    const input = `${name}::${startedAt}`.toLowerCase();
    let hash = 0;
    for (let i = 0; i < input.length; i += 1) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash);
}

function formatEpisodeCode(seasonNumber: number, episodeNumber: number): string {
    if (!Number.isFinite(seasonNumber) || !Number.isFinite(episodeNumber) || seasonNumber <= 0 || episodeNumber <= 0) {
        return '';
    }

    const season = Math.trunc(seasonNumber).toString().padStart(2, '0');
    const episode = Math.trunc(episodeNumber).toString().padStart(2, '0');
    return `s${season}e${episode}`;
}

function normalizeTracearrMediaType(value: string): string {
    const mediaType = value.toLowerCase().trim();
    if (mediaType === 'live') return 'tvchannel';
    if (mediaType === 'tvchannel') return 'tvchannel';
    if (mediaType === 'tv_channel') return 'tvchannel';
    if (mediaType === 'channel') return 'tvchannel';
    if (mediaType === 'tv') return 'episode';
    if (mediaType === 'tvepisode') return 'episode';
    if (mediaType === 'episode') return 'episode';
    if (mediaType === 'film') return 'movie';
    if (mediaType === 'movie') return 'movie';
    if (mediaType === 'track') return 'audio';
    if (mediaType === 'song') return 'audio';
    if (mediaType === 'audio') return 'audio';
    if (mediaType === 'musicvideo') return 'musicvideo';
    return 'unknown';
}

function readPositiveNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function resolveTotalPages(payload: Record<string, unknown>, pageSize: number, fetchedCount: number): number {
    const pagination = (payload.pagination ?? payload.meta ?? payload.pageInfo) as Record<string, unknown> | undefined;

    const directTotalPages =
        readPositiveNumber(pagination?.totalPages) ??
        readPositiveNumber(pagination?.pages) ??
        readPositiveNumber(payload.totalPages) ??
        readPositiveNumber(payload.pages) ??
        readPositiveNumber(payload.lastPage);

    if (directTotalPages) {
        return Math.max(1, Math.ceil(directTotalPages));
    }

    const totalItems =
        readPositiveNumber(pagination?.totalItems) ??
        readPositiveNumber(pagination?.total) ??
        readPositiveNumber(pagination?.count) ??
        readPositiveNumber(payload.totalItems) ??
        readPositiveNumber(payload.total) ??
        readPositiveNumber(payload.count);

    if (totalItems) {
        return Math.max(1, Math.ceil(totalItems / Math.max(1, pageSize)));
    }

    return fetchedCount >= pageSize ? 2 : 1;
}

async function fetchTracearrHistoryPage(
    tracearrUrl: string,
    tracearrApiKey: string,
    timezone: string,
    page: number,
    pageSize: number,
    startDate: string,
    endDate: string,
    includeDateFilters: boolean
): Promise<{ items: TracearrRecord[]; totalPages: number; }> {
    const url = new URL(`${tracearrUrl}/api/v1/public/history`);
    url.searchParams.set('page', String(page));
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('timezone', timezone);
    if (includeDateFilters) {
        url.searchParams.set('startDate', startDate);
        url.searchParams.set('endDate', endDate);
    }

    const response = await fetch(url.toString(), {
        headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${tracearrApiKey}`
        }
    });

    if (!response.ok) {
        throw new Error(`Tracearr API error: ${response.status} ${response.statusText}`);
    }

    const payload = await response.json() as Record<string, unknown>;
    const items =
        (Array.isArray(payload) && payload as TracearrRecord[]) ||
        (Array.isArray(payload.items) && payload.items as TracearrRecord[]) ||
        (Array.isArray(payload.data) && payload.data as TracearrRecord[]) ||
        (Array.isArray((payload.data as Record<string, unknown> | undefined)?.items) &&
            (payload.data as Record<string, unknown>).items as TracearrRecord[]) ||
        (Array.isArray(payload.history) && payload.history as TracearrRecord[]) ||
        (Array.isArray(payload.results) && payload.results as TracearrRecord[]) ||
        (Array.isArray(payload.records) && payload.records as TracearrRecord[]) ||
        [];
    const totalPages = resolveTotalPages(payload, pageSize, items.length);

    return { items, totalPages };
}

interface TracearrActivityOptions {
    tracearrUrl: string;
    tracearrApiKey: string;
    userId: string;
    username: string;
    days: number;
}

export async function getTracearrUserPlaybackActivity({
    tracearrUrl,
    tracearrApiKey,
    userId,
    username,
    days
}: TracearrActivityOptions): Promise<TracearrPlaybackActivity[]> {
    const requestedUsername = username.toLowerCase().trim();
    const tracearrTimezone = env.TRACEARR_TIMEZONE || env.APP_TIMEZONE || 'America/New_York';
    const endDate = new Date();
    const startDate = new Date();
    startDate.setUTCDate(endDate.getUTCDate() - Math.max(1, days));

    const dateOnly = (value: Date): string => value.toISOString().slice(0, 10);
    const pageSize = 100;
    const maxPages = 100;
    const tracearrRows: TracearrRecord[] = [];
    let page = 1;
    let totalPages = 1;
    let includeDateFilters = true;
    const localDateTimeFormatter = new Intl.DateTimeFormat('sv-SE', {
        timeZone: tracearrTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    do {
        const pageData = await fetchTracearrHistoryPage(
            tracearrUrl,
            tracearrApiKey,
            tracearrTimezone,
            page,
            pageSize,
            dateOnly(startDate),
            dateOnly(endDate),
            includeDateFilters
        );
        if (page === 1 && includeDateFilters && pageData.items.length === 0) {
            includeDateFilters = false;
            page = 1;
            totalPages = 1;
            tracearrRows.length = 0;
            continue;
        }
        tracearrRows.push(...pageData.items);
        totalPages = Math.min(pageData.totalPages, maxPages);
        page += 1;
    } while (page <= totalPages);

    return tracearrRows
        .filter((record) => {
            const tracearrUsername = readTracearrString(record, [
                'username',
                'userName',
                'serverUsername',
                'name',
                'session.userName',
                'session.user.username',
                'user.username',
                'user.name'
            ]).toLowerCase().trim();
            const tracearrUserId = readTracearrString(record, [
                'userId',
                'embyUserId',
                'session.userId',
                'session.user.id',
                'user.id'
            ]).toLowerCase().trim();
            return tracearrUsername === requestedUsername || tracearrUserId === userId.toLowerCase();
        })
        .flatMap((record): TracearrPlaybackActivity[] => {
            const startedAt = readTracearrString(record, [
                'startedAt',
                'session.startedAt',
                'startTime',
                'session.startTime',
                'createdAt',
                'date',
                'watchedAt',
                'lastViewedAt'
            ]);
            const dateObj = startedAt ? new Date(startedAt) : new Date();
            const isInvalidDate = Number.isNaN(dateObj.getTime());
            const safeDate = isInvalidDate ? new Date() : dateObj;
            const durationSecondsRaw = readTracearrNumber(record, [
                'duration',
                'durationSeconds',
                'durationSec',
                'session.durationSeconds',
                'watchTimeSeconds',
                'watchDuration',
                'watchedDuration',
                'playDuration',
                'playDurationSeconds'
            ]);
            const durationMs = readTracearrNumber(record, [
                'durationMs',
                'session.durationMs',
                'watchTimeMs',
                'watchDurationMs',
                'watchedDurationMs',
                'playDurationMs'
            ]);
            const durationSeconds = durationSecondsRaw > 0
                ? durationSecondsRaw
                : durationMs > 0
                    ? Math.round(durationMs / 1000)
                    : 0;

            const mediaTypeRaw = readTracearrString(record, [
                'mediaType',
                'session.mediaType',
                'media.type',
                'item.type',
                'item_type',
                'type'
            ]);
            const mediaType = normalizeTracearrMediaType(mediaTypeRaw);
            if (mediaType === 'audio') {
                console.log('AUDIO record:', JSON.stringify({
                    mediaTypeRaw,
                    mediaTitle: readTracearrString(record, ['mediaTitle', 'title']),
                    rawType: (record as Record<string, unknown>)['type'],
                    rawMediaType: (record as Record<string, unknown>)['mediaType']
                }));
            }
            if (mediaType === 'unknown' && mediaTypeRaw) {
                console.warn('Unrecognized Tracearr mediaType:', mediaTypeRaw);
            }
            const mediaTitle = readTracearrString(record, [
                'mediaTitle',
                'session.mediaTitle',
                'title',
                'item_name',
                'media.title',
                'item.title',
                'item.name'
            ]) || 'Unknown Title';
            const seriesTitle = readTracearrString(record, [
                'seriesTitle',
                'showTitle',
                'tvShowTitle',
                'seriesName',
                'grandparentTitle',
                'media.seriesTitle',
                'media.seriesName',
                'item.seriesName',
                'item.seriesTitle',
                'item.parentTitle',
                'parentTitle',
                'parent.title',
                'session.seriesTitle'
            ]);
            const seasonNumber = readTracearrNumber(record, [
                'seasonNumber',
                'season',
                'parentIndexNumber',
                'media.seasonNumber',
                'item.parentIndexNumber',
                'session.seasonNumber'
            ]);
            const episodeNumber = readTracearrNumber(record, [
                'episodeNumber',
                'episode',
                'indexNumber',
                'media.episodeNumber',
                'item.indexNumber',
                'session.episodeNumber'
            ]);
            const episodeCode = formatEpisodeCode(seasonNumber, episodeNumber);
            const normalizedSeriesTitle = seriesTitle.trim();
            const normalizedMediaTitle = mediaTitle.trim();
            const composedEpisodeTitle = [episodeCode, normalizedMediaTitle].filter(Boolean).join(' - ');
            const displayTitle = mediaType === 'episode' && normalizedSeriesTitle
                ? [normalizedSeriesTitle, composedEpisodeTitle || normalizedMediaTitle].filter(Boolean).join(' - ')
                : normalizedMediaTitle || 'Unknown Title';
            const idValue = readTracearrString(record, [
                'mediaId',
                'session.mediaId',
                'itemId',
                'ratingKey',
                'embyItemId',
                'item.id',
                'media.id'
            ]);
            const fallbackId = pseudoItemId(mediaTitle, safeDate.toISOString());
            const itemId = idValue || fallbackId;

            if (safeDate < startDate || safeDate > endDate) {
                return [];
            }

            const localDateTime = localDateTimeFormatter.format(safeDate);
            const [datePart, timePart = '00:00:00'] = localDateTime.split(' ');

            return [{
                date: datePart,
                time: timePart,
                user_id: userId,
                item_name: displayTitle,
                item_id: itemId,
                item_type: mediaType,
                duration: String(Math.max(0, Math.round(durationSeconds))),
                user_name: username,
                user_has_image: false,
                client: readTracearrString(record, ['platform']),
                client_name: readTracearrString(record, ['player', 'playerName']),
                device: readTracearrString(record, ['device']),
                device_name: readTracearrString(record, ['device', 'player']),
                app: readTracearrString(record, ['product']),
                app_name: readTracearrString(record, ['product']),
                _fromTracearr: true
            }];
        });
}
