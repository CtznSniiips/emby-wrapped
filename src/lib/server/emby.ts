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
    item_id: number;
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
    [key: string]: string | number | boolean | undefined;
}

type RawPlaybackActivity = Record<string, string | number | boolean | undefined>;
type RawBreakdownRecord = Record<string, string | number | boolean | undefined>;

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
