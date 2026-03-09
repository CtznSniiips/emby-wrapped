import type { PageServerLoad } from './$types';
import { getAvailableTimeRanges } from '$lib/server/stats';

export const load: PageServerLoad = async ({ url, locals }) => {
    const usernameParam = url.searchParams.get('user') || url.searchParams.get('username') || '';
    const periodParam = url.searchParams.get('period') || '';

    return {
        timeRangeOptions: getAvailableTimeRanges(),
        prefilledUsername: usernameParam || locals.authUser?.username || '',
        prefilledPeriod: periodParam,
        authUser: locals.authUser
    };
};
