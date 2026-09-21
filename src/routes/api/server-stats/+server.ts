import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseTimeRange } from '$lib/server/stats';
import { getAuthSession } from '$lib/server/auth';
import { getOrComputeServerStats } from '$lib/server/serverStatsCache';

export type { ServerStats } from '$lib/server/serverStatsCache';

export const GET: RequestHandler = async ({ url, cookies }) => {
    const session = getAuthSession(cookies);
    if (!session) return json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const periodParam = url.searchParams.get('period') || String(new Date().getFullYear() - 1);
        // Validate the period parses cleanly before handing it to the cache layer.
        parseTimeRange(periodParam);

        const stats = await getOrComputeServerStats(periodParam);
        return json(stats);
    } catch (e) {
        console.error('Error fetching server stats:', e);
        return json({ error: 'Failed to fetch server stats' }, { status: 500 });
    }
};
