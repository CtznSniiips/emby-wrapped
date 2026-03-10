import type { PageServerLoad } from './$types';
import { getAvailableTimeRanges } from '$lib/server/stats';
import { getAuthSession } from '$lib/server/auth';
import { getRequestedPeriod } from '$lib/server/period';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ url, cookies }) => {
    const periodParam = getRequestedPeriod(url);
    const session = getAuthSession(cookies);

    if (!session) {
        const query = new URLSearchParams();
        if (periodParam) query.set('period', periodParam);
        throw redirect(307, `/login${query.toString() ? `?${query.toString()}` : ''}`);
    }

    return {
        timeRangeOptions: getAvailableTimeRanges(),
        prefilledUsername: session.username,
        prefilledPeriod: periodParam,
        authenticatedUser: session
    };
};
