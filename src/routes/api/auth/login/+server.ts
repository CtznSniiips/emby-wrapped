import { json } from '@sveltejs/kit';
import { emby } from '$lib/server/emby';
import { setAuthSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

const loginAttempts = new Map<string, { count: number; resetAt: number }>();

export const POST: RequestHandler = async ({ request, cookies, getClientAddress }) => {
    const body = await request.json().catch(() => null) as { username?: string; password?: string } | null;
    const username = body?.username?.trim();
    const password = body?.password ?? '';
    const ip = getClientAddress();
        const now = Date.now();
        const entry = loginAttempts.get(ip);

        if (entry && now < entry.resetAt && entry.count >= 10) {
            return json({ valid: false, error: 'Too many attempts, try again later' }, { status: 429 });
        }

        if (!entry || now >= entry.resetAt) {
            loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 }); // 15 min window
        } else {
            entry.count++;
        }

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
