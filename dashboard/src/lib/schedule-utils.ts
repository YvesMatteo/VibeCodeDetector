/**
 * Shared scheduling utilities for monitoring and cron.
 * Single source of truth for next-run computation.
 */

/**
 * Compute the next run time for a scheduled scan.
 * Always returns a future timestamp.
 */
export function computeNextRun(
    frequency: string,
    hourUtc: number,
    dayOfWeek?: number | null,
): string {
    const now = new Date();
    const next = new Date(now);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(hourUtc);

    if (frequency === 'daily') {
        // If the computed time is in the past (or now), advance to tomorrow
        if (next <= now) next.setUTCDate(next.getUTCDate() + 1);
    } else if (frequency === 'weekly') {
        const dow = dayOfWeek ?? 1; // default Monday
        const currentDow = next.getUTCDay();
        let daysUntil = dow - currentDow;
        if (daysUntil < 0 || (daysUntil === 0 && next <= now)) daysUntil += 7;
        next.setUTCDate(next.getUTCDate() + daysUntil);
    } else if (frequency === 'monthly') {
        next.setUTCDate(1);
        if (next <= now) next.setUTCMonth(next.getUTCMonth() + 1);
    }

    return next.toISOString();
}

/**
 * Resolve the app's base URL for internal service calls.
 * Handles Vercel deployment, custom domains, and local dev.
 */
export function resolveAppUrl(): string {
    // Explicit app URL takes priority (e.g. custom domain)
    if (process.env.NEXT_PUBLIC_APP_URL) {
        return process.env.NEXT_PUBLIC_APP_URL;
    }
    // Vercel auto-sets VERCEL_URL (without protocol)
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }
    return 'http://localhost:3000';
}
