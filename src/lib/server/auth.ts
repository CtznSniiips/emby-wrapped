import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

const SESSION_COOKIE = 'emby_wrapped_session';
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export interface SessionUser {
    id: string;
    username: string;
    accessToken: string;
}

export function setSessionCookie(cookies: Cookies, user: SessionUser): void {
    cookies.set(SESSION_COOKIE, JSON.stringify(user), {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: !dev,
        maxAge: SESSION_DURATION_SECONDS
    });
}

export function getSessionUser(cookies: Cookies): SessionUser | null {
    const raw = cookies.get(SESSION_COOKIE);
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as SessionUser;
        if (!parsed.id || !parsed.username || !parsed.accessToken) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

export function clearSessionCookie(cookies: Cookies): void {
    cookies.delete(SESSION_COOKIE, {
        path: '/'
    });
}
