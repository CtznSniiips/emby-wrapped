import { json } from '@sveltejs/kit';
import { emby } from '$lib/server/emby';
import { setAuthSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
    const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
    const username = body?.username?.trim();
    const password = body?.password ?? '';

    if (!username || !password) {
        return json({ valid: false, error: 'Username and password are required' }, { status: 400 });
    }

    try {
        const user = await emby.authenticateUser(username, password);

        if (!user) {
            return json({ valid: false, error: 'Invalid username or password' }, { status: 401 });
        }

        setAuthSession(cookies, { userId: user.Id, username: user.Name });

        return json({ valid: true, userId: user.Id, username: user.Name });
    } catch (error) {
        console.error('Error logging in user:', error);
        return json({ valid: false, error: 'Failed to connect to Emby server' }, { status: 500 });
    }
};
