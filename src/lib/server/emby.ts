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

export interface EmbyAuthResponse {
    User: EmbyUser;
    AccessToken: string;
    SessionInfo?: {
        Id: string;
    };
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

    private async post<T>(endpoint: string, body: unknown, params: Record<string, string> = {}): Promise<T> {
        const url = new URL(`${this.baseUrl}${endpoint}`);
        url.searchParams.set('api_key', this.apiKey);

        for (const [key, value] of Object.entries(params)) {
            url.searchParams.set(key, value);
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

    /**
     * Authenticate a user with username and password against Emby
     */
    async authenticateByName(username: string, password: string): Promise<EmbyAuthResponse> {
        return this.post<EmbyAuthResponse>('/Users/AuthenticateByName', {
            Username: username,
            Pw: password
        });
    }

    /**
     * Get playback activity for a specific user from the Playback Reporting plugin
     */
    async getUserPlaybackActivity(userId: string, days: number = 365): Promise<PlaybackActivity[]> {
        return this.fetch<PlaybackActivity[]>('/user_usage_stats/UserPlaylist', {
            user_id: userId,
            days: days.toString()
        });
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
