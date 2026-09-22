import { building } from '$app/environment';
import { runInitialWarmup, scheduleRecurringRefresh } from '$lib/server/cacheWarmup';

// Runs once when the server process starts (not during `vite build`).
// Cache warmup is intentionally fire-and-forget here: it must not block
// the server from accepting requests (and failing the Docker healthcheck)
// while it works through every user/period combination.
export async function init() {
    if (building) return;

    runInitialWarmup().catch((e) => console.error('[cache-warmup] Unhandled error during initial warmup:', e));
    scheduleRecurringRefresh();
}
