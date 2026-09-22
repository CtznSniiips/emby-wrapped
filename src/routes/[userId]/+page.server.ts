import { error, redirect } from '@sveltejs/kit';
import { emby } from '$lib/server/emby';
import { getAuthSession } from '$lib/server/auth';
import { getRequestedPeriod } from '$lib/server/period';
import { parseTimeRange, timeRangeToString, getAvailableTimeRanges } from '$lib/server/stats';
import { getOrComputeUserStats } from '$lib/server/userStatsCache';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url, cookies }) => {
    const { userId: userIdentifier } = params;
    const periodParam = getRequestedPeriod(url) || null;

    const session = getAuthSession(cookies);

    if (!session) {
        const nextUrl = periodParam ? `/login?period=${encodeURIComponent(periodParam)}` : '/login';
        throw redirect(307, nextUrl);
    }

    // Legacy shorthand links like `/:userId?2026` should land on community stats first
    // while preserving both user and period as homepage query params.
    const rawQuery = url.search.slice(1);
    const shorthandParam = !rawQuery.includes('=') && rawQuery ? decodeURIComponent(rawQuery) : null;
    if (shorthandParam) {
        const nextUrl = `/?user=${encodeURIComponent(userIdentifier)}&period=${encodeURIComponent(shorthandParam)}`;
        throw redirect(307, nextUrl);
    }

    // Direct links like `/:userId` should open the community intro flow first,
    // with the username prefilled for the final step.
    const hasPeriodParam = url.searchParams.has('period');
    if (!rawQuery && !hasPeriodParam) {
        const nextUrl = `/?user=${encodeURIComponent(userIdentifier)}`;
        throw redirect(307, nextUrl);
    }

    // Get time range from URL parameter, default to previous year
    const now = new Date();
    const defaultTimeRange = String(now.getFullYear() - 1);
    const timeRangeParam = periodParam || defaultTimeRange;
    const timeRange = parseTimeRange(timeRangeParam);
    const timeRangeStr = timeRangeToString(timeRange);

    try {
        const users = await emby.getUsers();
        const user = users.find((u) =>
            u.Id === userIdentifier || u.Name.toLowerCase() === userIdentifier.toLowerCase()
        );

        if (!user) {
            throw error(404, 'User not found');
        }

        if (user.Id !== session.userId) {
            throw redirect(307, `/${session.userId}?period=${encodeURIComponent(timeRangeStr)}`);
        }

        const stats = await getOrComputeUserStats(user.Id, user.Name, timeRangeStr);

        const rawUserImageUrl = user.PrimaryImageTag
            ? emby.getUserImageUrl(user.Id)
            : null;

        // Proxy the image to avoid Local Network Access browser restrictions
        const userImageUrl = rawUserImageUrl
            ? `/api/proxy-image?url=${encodeURIComponent(rawUserImageUrl)}`
            : null;

        // Get available time range options
        const timeRangeOptions = getAvailableTimeRanges();

        return {
            stats,
            userImageUrl,
            serverName: 'Emby for the People',
            currentTimeRange: timeRangeStr,
            timeRangeOptions
        };
    } catch (e) {
        if ((e as { status?: number }).status === 404) {
            throw e;
        }

        throw error(500, 'Failed to load your wrapped data');
    }
};
