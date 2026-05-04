import { writable } from 'svelte/store';

export interface LoadingStats {
    totalUsers?: number;
    totalMinutes?: number;
    totalMovies?: number;
    totalEpisodes?: number;
    topShows?: { name: string }[];
    topMovies?: { name: string }[];
}

export const serverStatsStore = writable<LoadingStats | null>(null);
