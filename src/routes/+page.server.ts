import type { PageServerLoad } from './$types';
import { getAvailableTimeRanges } from '$lib/server/stats';

export const load: PageServerLoad = async ({ url }) => {
    const usernameParam = url.searchParams.get('user') || url.searchParams.get('username') || '';
    const periodParam = url.searchParams.get('period') || '';

    return {
        timeRangeOptions: getAvailableTimeRanges(),
        prefilledUsername: usernameParam,
        prefilledPeriod: periodParam
    };
};
