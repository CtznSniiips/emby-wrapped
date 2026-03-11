import { json } from '@sveltejs/kit';
import { emby } from '$lib/server/emby';
import type { RequestHandler } from './$types';
import { getAuthSession } from '$lib/server/auth';

export const GET: RequestHandler = async ({ url, cookies }) => {  // add cookies
    const session = getAuthSession(cookies);
    if (!session) return json({ valid: false, error: 'Unauthorized' }, { status: 401 });
    const username = url.searchParams.get('username');

    if (!username) {
        return json({ valid: false, error: 'Username is required' }, { status: 400 });
    }

    try {
        const user = await emby.findUserByName(username.trim());

        if (user) {
            return json({
                valid: true,
                userId: user.Id,
                username: user.Name
            });
        } else {
            return json({
                valid: false,
                error: 'User not found on this server'
            });
        }
    } catch (error) {
        console.error('Error validating user:', error);
        return json({
            valid: false,
            error: 'Failed to connect to Emby server'
        }, { status: 500 });
    }
};
