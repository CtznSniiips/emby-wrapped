import type { Cookies } from '@sveltejs/kit';
import { randomBytes } from 'crypto';

export const AUTH_COOKIE_NAME = 'wrapped_auth';

export interface AuthSession {
    userId: string;
    username: string;
}

// In-memory session store: token → session data
// Sessions survive until server restart or explicit logout.
// For persistence across restarts, swap this Map for a file or SQLite store.
const sessionStore = new Map<string, AuthSession>();

export function setAuthSession(cookies: Cookies, session: AuthSession, secure: boolean): void {
    // Generate a cryptographically random token - this is all the cookie holds
    const token = randomBytes(32).toString('hex');
    sessionStore.set(token, session);

    cookies.set(AUTH_COOKIE_NAME, token, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure,
        maxAge: 60 * 60 * 24 * 30
    });
}

export function getAuthSession(cookies: Cookies): AuthSession | null {
    const token = cookies.get(AUTH_COOKIE_NAME);
    if (!token) return null;
    return sessionStore.get(token) ?? null;
}

export function clearAuthSession(cookies: Cookies): void {
    const token = cookies.get(AUTH_COOKIE_NAME);
    if (token) {
        sessionStore.delete(token); // Remove from server-side store too
    }
    cookies.delete(AUTH_COOKIE_NAME, { path: '/' });
}