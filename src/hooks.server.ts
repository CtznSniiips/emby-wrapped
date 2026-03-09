import type { Handle } from '@sveltejs/kit';
import { getSessionUser } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
    event.locals.authUser = getSessionUser(event.cookies);

    return resolve(event);
};
