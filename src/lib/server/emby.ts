import { env } from '$env/dynamic/private';

export interface EmbyUser {
    Id: string;
    Name: string;
    ServerId: string;
    HasPassword: boolean;
    HasConfiguredPassword: boolean;
    HasConfiguredEasyPassword: boolean;
    EnableAutoLogin: boolean;
    LastLoginDate?: string;
    LastActivityDate?: string;
    Policy?: {
        IsAdministrator: boolean;
        IsHidden: boolean;
        IsDisabled: boolean;
    };
    PrimaryImageTag?: string;
}

export interface PlaybackActivity {
    date: string;
    time: string;
    user_id: string;
    item_name: string;
    item_id: number | string;
    item_type: string;
    duration: string;  // seconds as string
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

type RawPlaybackActivity = Record<string, string | number | boolean | undefined>;
type RawBreakdownRecord = Record<string, string | number | boolean | undefined>;
type TracearrRecord = Record<string, unknown>;

export interface DeviceBreakdownEntry {
    name: string;
    minutes: number;
    count: number;
}

function readFirstString(record: RawPlaybackActivity, keys: string[]): string {
    for (const key of keys) {
        const value = record[key];
        if (value === undefined || value === null) continue;
        const str = String(value).trim();
        if (str.length > 0) return str;
    }
    return '';
}

function normalizePlaybackActivityRecord(record: RawPlaybackActivity): PlaybackActivity {
    const normalized: PlaybackActivity = {
        date: readFirstString(record, ['date', 'Date']),
        time: readFirstString(record, ['time', 'Time']),
        user_id: readFirstString(record, ['user_id', 'UserId']),
        item_name: readFirstString(record, ['item_name', 'ItemName']),
        item_id: Number(readFirstString(record, ['item_id', 'ItemId']) || '0'),
        item_type: readFirstString(record, ['item_type', 'ItemType']),
        duration: readFirstString(record, ['duration', 'PlayDuration', 'Duration']),
        remote_address: readFirstString(record, ['remote_address', 'RemoteAddress']) || undefined,
        user_name: readFirstString(record, ['user_name', 'UserName']),
        user_has_image: readFirstString(record, ['user_has_image', 'UserPrimaryImageTag']) !== '',
        client: readFirstString(record, ['client', 'Client']) || undefined,
        client_name: readFirstString(record, ['client_name', 'ClientName']) || undefined,
        device: readFirstString(record, ['device', 'Device']) || undefined,
        device_name: readFirstString(record, ['device_name', 'DeviceName']) || undefined,
        app: readFirstString(record, ['app', 'ApplicationName']) || undefined,
        app_name: readFirstString(record, ['app_name', 'AppName']) || undefined
    };

    return {
        ...record,
        ...normalized
    };
}

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

function normalizeTracearrMediaType(value: string): string {
    const mediaType = value.toLowerCase().trim();
    if (mediaType === 'tv') return 'episode';
    if (mediaType === 'tvepisode') return 'episode';
    if (mediaType === 'episode') return 'episode';
    if (mediaType === 'film') return 'movie';
    if (mediaType === 'movie') return 'movie';
    if (mediaType === 'track') return 'audio';
    if (mediaType === 'song') return 'audio';
    if (mediaType === 'audio') return 'audio';
    return mediaType || 'unknown';
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

export interface EmbyItem {
    Id: string;
    Name: string;
    Type: string;
    SeriesName?: string;
    SeasonName?: string;
    IndexNumber?: number;
    ParentIndexNumber?: number;
    ProductionYear?: number;
    PremiereDate?: string;
    Genres?: string[];
    Studios?: { Name: string }[];
    People?: { Name: string; Type: string; Role?: string }[];
    CommunityRating?: number;
    OfficialRating?: string;
    RunTimeTicks?: number;
    ImageTags?: {
        Primary?: string;
        Backdrop?: string;
    };
    BackdropImageTags?: string[];
    SeriesId?: string;
    SeriesPrimaryImageTag?: string;
    ArtistIds?: string[];
    AlbumArtistIds?: string[];
    AlbumId?: string;
    AlbumPrimaryImageTag?: string;
}

class EmbyClient {
    private get tracearrUrl(): string {
        return (env.TRACEARR_URL || '').trim().replace(/\/$/, '');
    }

    private get tracearrApiKey(): string {
        return (env.TRACEARR_API_KEY || '').trim();
    }

    private get useTracearrHistory(): boolean {
        return Boolean(this.tracearrUrl && this.tracearrApiKey);
    }

    private get baseUrl(): string {
        const configured =
            env.EMBY_URL || env.EMBY_SERVER_URL; // EMBY_SERVER_URL kept for backwards compatibility

        if (!configured) {
            throw new Error('Missing required environment variable: EMBY_URL (or legacy EMBY_SERVER_URL)');
        }

        return configured.replace(/\/$/, '');
    }

    private get apiKey(): string {
        return env.EMBY_API_KEY || '';
    }

    private async fetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        url.searchParams.set('api_key', this.apiKey);

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
        }

        const response = await fetch(url.toString(), {
            headers: {
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Emby API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    private async post<T>(endpoint: string, body: Record<string, string>): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`);

        if (this.apiKey) {
            url.searchParams.set('api_key', this.apiKey);
        }

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            throw new Error(`Emby API error: ${response.status} ${response.statusText}`);
        }

        return response.json();
    }

    private async fetchTracearrHistoryPage(
        page: number,
        pageSize: number,
        startDate: string,
        endDate: string,
        includeDateFilters: boolean
    ): Promise<{ items: TracearrRecord[]; totalPages: number; }> {
        const url = new URL(`${this.tracearrUrl}/api/v1/public/history`);
        url.searchParams.set('page', String(page));
        url.searchParams.set('pageSize', String(pageSize));
        if (includeDateFilters) {
            url.searchParams.set('startDate', startDate);
            url.searchParams.set('endDate', endDate);
        }

        const response = await fetch(url.toString(), {
            headers: {
                'Accept': 'application/json',
                'Authorization': `Bearer ${this.tracearrApiKey}`
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

    /**
     * Get all users from the Emby server
     */
    async getUsers(): Promise<EmbyUser[]> {
        return this.fetch<EmbyUser[]>('/Users');
    }

    /**
     * Find a user by username (case-insensitive)
     */
    async findUserByName(username: string): Promise<EmbyUser | null> {
        const users = await this.getUsers();
        return users.find(u => u.Name.toLowerCase() === username.toLowerCase()) || null;
    }

    async authenticateUser(username: string, password: string): Promise<EmbyUser | null> {
        interface AuthResponse {
            User?: EmbyUser;
        }

        const response = await this.post<AuthResponse>('/Users/AuthenticateByName', {
            Username: username,
            Pw: password
        });

        return response.User || null;
    }

    /**
     * Get playback activity for a specific user from the Playback Reporting plugin
     */
    async getUserPlaybackActivity(userId: string, days: number = 365): Promise<PlaybackActivity[]> {
        if (this.useTracearrHistory) {
            const users = await this.getUsers();
            const requestedUser = users.find((user) => user.Id === userId);
            const requestedUsername = requestedUser?.Name?.toLowerCase().trim();
            const userName = requestedUser?.Name;
            if (!requestedUsername || !userName) return [];

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

            do {
                const pageData = await this.fetchTracearrHistoryPage(page, pageSize, dateOnly(startDate), dateOnly(endDate), includeDateFilters);
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
                    const username = readTracearrString(record, [
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
                    return username === requestedUsername || tracearrUserId === userId.toLowerCase();
                })
                .flatMap((record): PlaybackActivity[] => {
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
                        'item_type',
                        'type',
                        'media.type',
                        'item.type'
                    ]);
                    const mediaType = normalizeTracearrMediaType(mediaTypeRaw);
                    const mediaTitle = readTracearrString(record, [
                        'mediaTitle',
                        'session.mediaTitle',
                        'title',
                        'item_name',
                        'media.title',
                        'item.title',
                        'item.name'
                    ]) || 'Unknown Title';
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

                    const utcDate = safeDate.toISOString();
                    const [datePart, timePart = '00:00:00'] = utcDate.split('T');

                    return [{
                        date: datePart,
                        time: timePart.replace('Z', ''),
                        user_id: userId,
                        item_name: mediaTitle,
                        item_id: itemId,
                        item_type: mediaType,
                        duration: String(Math.max(0, Math.round(durationSeconds))),
                        user_name: userName,
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

        const activity = await this.fetch<RawPlaybackActivity[]>('/user_usage_stats/UserPlaylist', {
            user_id: userId,
            days: days.toString()
        });

        return activity.map((record) => normalizePlaybackActivityRecord(record));
    }

    /**
     * Get device-name breakdown directly from Playback Reporting plugin.
     * This endpoint is more reliable than per-event device fields on some plugin versions.
     */
    async getDeviceNameBreakdown(userId: string, days: number): Promise<DeviceBreakdownEntry[]> {
        if (this.useTracearrHistory) {
            const activity = await this.getUserPlaybackActivity(userId, days);
            const byDevice = new Map<string, DeviceBreakdownEntry>();

            for (const row of activity) {
                const name = row.device_name || row.device || row.client_name || row.client || row.app_name || row.app || 'Unknown Device';
                const minutes = Math.max(0, Number(row.duration || '0')) / 60;
                const current = byDevice.get(name) || { name, minutes: 0, count: 0 };
                current.minutes += minutes;
                current.count += 1;
                byDevice.set(name, current);
            }

            return [...byDevice.values()]
                .filter((row) => row.minutes > 0)
                .sort((a, b) => b.minutes - a.minutes);
        }

        const report = await this.fetch<RawBreakdownRecord[]>('/user_usage_stats/DeviceName/BreakdownReport', {
            user_id: userId,
            days: String(days)
        });

        const readNumber = (record: RawBreakdownRecord, keys: string[]): number => {
            const raw = readFirstString(record, keys);
            const parsed = Number(raw);
            return Number.isFinite(parsed) ? parsed : 0;
        };

        return report
            .map((record): DeviceBreakdownEntry => {
                const name = readFirstString(record, [
                    'name',
                    'Name',
                    'device_name',
                    'DeviceName',
                    'label',
                    'Label',
                    'ReportName'
                ]);
                const durationSeconds = readNumber(record, [
                    'duration',
                    'Duration',
                    'TotalDuration',
                    'PlayDuration',
                    'TotalPlayDuration',
                    'time',
                    'Time'
                ]);
                const count = Math.round(readNumber(record, ['count', 'Count', 'PlaybackCount', 'Plays', 'Items']));

                return {
                    name,
                    minutes: durationSeconds / 60,
                    count
                };
            })
            .filter((row) => row.name.trim().length > 0 && row.minutes > 0);
    }

    /**
     * Get item details by ID
     */
    async getItem(userId: string, itemId: string): Promise<EmbyItem> {
        return this.fetch<EmbyItem>(`/Users/${userId}/Items/${itemId}`);
    }

    /**
     * Get multiple items by IDs
     */
    async getItems(userId: string, itemIds: string[]): Promise<EmbyItem[]> {
        if (itemIds.length === 0) return [];

        interface ItemsResponse {
            Items: EmbyItem[];
            TotalRecordCount: number;
        }

        const response = await this.fetch<ItemsResponse>(`/Users/${userId}/Items`, {
            Ids: itemIds.join(','),
            Fields: 'Genres,Studios,People,ProductionYear,PremiereDate,CommunityRating,OfficialRating,ImageTags,BackdropImageTags,SeriesId,SeriesPrimaryImageTag'
        });

        return response.Items;
    }

    /**
     * Get image URL for an item
     */
    getImageUrl(itemId: string, imageType: 'Primary' | 'Backdrop' = 'Primary', maxWidth: number = 400): string {
        return `${this.baseUrl}/Items/${itemId}/Images/${imageType}?maxWidth=${maxWidth}&api_key=${this.apiKey}`;
    }

    /**
     * Get logo URL for a Live TV channel using its real channel item ID
     */
    getLiveTvChannelLogoUrl(channelId: string, maxWidth: number = 400): string {
        return `${this.baseUrl}/Items/${channelId}/Images/Primary?maxWidth=${maxWidth}&api_key=${this.apiKey}`;
    }

    /**
     * Fetch all Live TV channels from Emby.
     * Returns a map of lowercase channel name → channel item ID so we can
     * resolve the correct image ID from playback-log names.
     */
    async getLiveTvChannels(userId: string): Promise<Map<string, string>> {
        interface ChannelResponse {
            Items: { Id: string; Name: string }[];
            TotalRecordCount: number;
        }
        try {
            const response = await this.fetch<ChannelResponse>('/LiveTv/Channels', {
                UserId: userId,
                Limit: '1000',
                Fields: 'PrimaryImageAspectRatio'
            });
            const map = new Map<string, string>();
            for (const ch of response.Items ?? []) {
                if (ch.Id && ch.Name) {
                    map.set(ch.Name.trim().toLowerCase().replace(/\s+/g, ' '), ch.Id);
                }
            }
            return map;
        } catch {
            return new Map();
        }
    }

    /**
     * Get API base URL
     */
    getApiBaseUrl(): string {
        return this.baseUrl;
    }

    /**
     * Get API key
     */
    getApiKey(): string {
        return this.apiKey;
    }

    /**
     * Get user profile image URL
     */
    getUserImageUrl(userId: string, maxWidth: number = 200): string {
        return `${this.baseUrl}/Users/${userId}/Images/Primary?maxWidth=${maxWidth}&api_key=${this.apiKey}`;
    }

    /**
     * Get total episode count for a series
     */
    async getSeriesEpisodeCount(userId: string, seriesId: string): Promise<number> {
        interface ItemsResponse {
            TotalRecordCount: number;
        }

        const response = await this.fetch<ItemsResponse>(`/Users/${userId}/Items`, {
            ParentId: seriesId,
            IncludeItemTypes: 'Episode',
            Recursive: 'true',
            Limit: '1'
        });

        return response.TotalRecordCount || 0;
    }
}

// Export singleton instance
export const emby = new EmbyClient();
