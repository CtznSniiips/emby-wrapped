import { json } from '@sveltejs/kit';
import { emby } from '$lib/server/emby';
import { setSessionCookie } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const body = await request.json();
        const username = typeof body?.username === 'string' ? body.username.trim() : '';
        const password = typeof body?.password === 'string' ? body.password : '';

        if (!username || !password) {
            return json({ valid: false, error: 'Username and password are required' }, { status: 400 });
        }

        const auth = await emby.authenticateByName(username, password);

        setSessionCookie(cookies, {
            id: auth.User.Id,
            username: auth.User.Name,
            accessToken: auth.AccessToken
        });

        return json({
            valid: true,
            userId: auth.User.Id,
            username: auth.User.Name
        });
    } catch (error) {
        console.error('Login failed:', error);
        return json({
            valid: false,
            error: 'Invalid Emby credentials'
        }, { status: 401 });
    }
};
