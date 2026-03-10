import type { LayoutServerLoad } from './$types';
import { env } from '$env/dynamic/private';
import { getAuthSession } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ cookies }) => {
    const session = getAuthSession(cookies);

    return {
        analyticsScript: env.ANALYTICS_SCRIPT || '',
        isAuthenticated: Boolean(session)
    };
};
