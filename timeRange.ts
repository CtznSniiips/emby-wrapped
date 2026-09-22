// ---------------------------------------------------------------------
// Time range utilities
//
// Extracted from stats.ts so they can be imported by userActivityCache.ts
// without creating a circular dependency (stats.ts's aggregateUserStats
// needs to call into userActivityCache.ts, which needs these utilities).
// stats.ts re-exports everything here for backward compatibility with its
// other existing importers.
// ---------------------------------------------------------------------

export interface TimeRange {
    type: 'year' | 'month';
    year: number;
    month?: number;  // 1-12, only for type 'month'
}

export function parseTimeRange(value: string): TimeRange {
    if (value.indexOf('-') !== -1) {
        // Supported month formats:
        // - "1-2026" / "01-2026" (preferred)
        // - "2026-01" (legacy)
        const parts = value.split('-');

        if (parts[0].length === 4) {
            // Legacy year-month format
            return { type: 'month', year: Number(parts[0]), month: Number(parts[1]) };
        }

        // Preferred month-year format
        return { type: 'month', year: Number(parts[1]), month: Number(parts[0]) };
    }
    // Format: "2025" (year)
    return { type: 'year', year: Number(value) };
}

export function formatTimeRangeLabel(range: TimeRange): string {
    if (range.type === 'month' && range.month) {
        return `${range.month}-${range.year}`;
    }
    return `${range.year}`;
}

export function timeRangeToString(range: TimeRange): string {
    if (range.type === 'month' && range.month) {
        return `${range.month}-${range.year}`;
    }
    return String(range.year);
}

function getDateParts(dateStr: string): { year: number; month: number } | null {
    const dateMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (dateMatch) {
        return {
            year: Number(dateMatch[1]),
            month: Number(dateMatch[2])
        };
    }

    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) return null;

    return {
        year: parsed.getUTCFullYear(),
        month: parsed.getUTCMonth() + 1
    };
}

/**
 * Check if a date matches the given time range
 */
export function matchesTimeRange(dateStr: string, range: TimeRange): boolean {
    const dateParts = getDateParts(dateStr);
    if (!dateParts) return false;

    if (range.type === 'year') {
        return dateParts.year === range.year;
    }
    // Month: check both year and month
    return dateParts.year === range.year && dateParts.month === range.month;
}

/**
 * Generate available time range options based on current date
 */
export function getAvailableTimeRanges(): { value: string; label: string }[] {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-12

    const options: { value: string; label: string }[] = [];

    // Add previous year
    options.push({ value: String(currentYear - 1), label: `${currentYear - 1}` });

    // Add current year (full year-to-date)
    options.push({ value: String(currentYear), label: `${currentYear}` });

    // Add months of current year (strictly before current month)
    for (let month = 1; month < currentMonth; month++) {
        const monthStr = month < 10 ? '0' + month : String(month);
        options.push({
            value: `${monthStr}-${currentYear}`,
            label: `${month}-${currentYear}`
        });
    }

    // Reverse to show newest first
    return options.reverse();
}

/**
 * Calculate how many days back we need to fetch to cover the requested time range
 */
export function calculateLookbackDays(range: TimeRange): number {
    const now = new Date();
    const targetStart = range.type === 'month' && range.month
        ? new Date(range.year, range.month - 1, 1) // First day of requested month
        : new Date(range.year, 0, 1); // Jan 1st of requested year

    // If target is in the future (manual URL edits), fetch a minimal safe window
    if (targetStart > now) return 31;

    // Calculate difference in days and add a small buffer for timezone/plugin boundaries
    const diffTime = now.getTime() - targetStart.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Avoid over-fetching large windows for current-year/month (can skew capped plugin results)
    return Math.max(31, diffDays + 14);
}

/** Whether the given (year, month) has fully elapsed as of now. */
export function isCompletedMonth(year: number, month: number): boolean {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    return year < currentYear || (year === currentYear && month < currentMonth);
}

/** The list of (year, month) buckets a time range decomposes into. */
export function getMonthsInRange(range: TimeRange): { year: number; month: number }[] {
    if (range.type === 'month' && range.month) {
        return [{ year: range.year, month: range.month }];
    }
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const lastMonth = range.year === currentYear ? currentMonth : 12;
    return Array.from({ length: lastMonth }, (_, i) => ({ year: range.year, month: i + 1 }));
}
