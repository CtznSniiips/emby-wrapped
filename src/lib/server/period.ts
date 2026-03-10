function normalizePeriod(value: string | null): string | null {
    if (!value) return null;

    const trimmed = value.trim();
    if (!trimmed) return null;

    const yearMatch = trimmed.match(/^(\d{4})$/);
    if (yearMatch) return yearMatch[1];

    const monthYearMatch = trimmed.match(/^(\d{1,2})-(\d{4})$/);
    if (monthYearMatch) {
        const month = Number(monthYearMatch[1]);
        const year = Number(monthYearMatch[2]);
        if (month >= 1 && month <= 12 && year >= 1900) {
            return `${month}-${year}`;
        }
    }

    const legacyYearMonthMatch = trimmed.match(/^(\d{4})-(\d{1,2})$/);
    if (legacyYearMonthMatch) {
        const year = Number(legacyYearMonthMatch[1]);
        const month = Number(legacyYearMonthMatch[2]);
        if (month >= 1 && month <= 12 && year >= 1900) {
            return `${month}-${year}`;
        }
    }

    return null;
}

export function getRequestedPeriod(url: URL): string {
    const explicitPeriod = normalizePeriod(url.searchParams.get('period'));
    if (explicitPeriod) return explicitPeriod;

    for (const [key, value] of url.searchParams.entries()) {
        if (key === 'period' || value !== '') continue;
        const shorthandKeyPeriod = normalizePeriod(key);
        if (shorthandKeyPeriod) return shorthandKeyPeriod;
    }

    const rawQuery = url.search.slice(1);
    if (!rawQuery || rawQuery.includes('=')) return '';

    return normalizePeriod(decodeURIComponent(rawQuery)) || '';
}
