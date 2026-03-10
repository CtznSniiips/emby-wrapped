import type { PageServerLoad } from './$types';
import { getAvailableTimeRanges } from '$lib/server/stats';
import { getAuthSession } from '$lib/server/auth';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, cookies }) => {
    const periodParam = url.searchParams.get('period') || '';
    const session = getAuthSession(cookies);

    if (session) {
        const query = new URLSearchParams();
        if (periodParam) query.set('period', periodParam);
        throw redirect(307, `/${query.toString() ? `?${query.toString()}` : ''}`);
    }

    return {
        timeRangeOptions: getAvailableTimeRanges(),
        prefilledPeriod: periodParam
    };
};
