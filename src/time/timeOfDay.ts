import SunCalc from "suncalc";
import { getResolvedTimeZone, getTimezoneCoordinates } from "./timezoneCoordinates";

export type DaylightWindow = {
    sunrise: Date;
    sunset: Date;
};

const daylightCache = new Map<string, DaylightWindow | null>();

function normalizeToLocalNoon(date: Date) {
    const normalized = new Date(date);
    normalized.setHours(12, 0, 0, 0);
    return normalized;
}

function getCacheKey(date: Date, timeZone: string) {
    const cacheDate = normalizeToLocalNoon(date);
    const year = cacheDate.getFullYear();
    const month = cacheDate.getMonth() + 1;
    const day = cacheDate.getDate();
    return `${timeZone}:${year}-${month}-${day}`;
}

export function getDaylightWindow(now = new Date(), timeZone?: string): DaylightWindow | null {
    const timeZoneId = timeZone ?? getResolvedTimeZone();
    if (!timeZoneId) return null;

    const cacheKey = getCacheKey(now, timeZoneId);
    const cached = daylightCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const coordinates = getTimezoneCoordinates(timeZoneId);
    if (!coordinates) {
        daylightCache.set(cacheKey, null);
        return null;
    }

    try {
        const calcDate = normalizeToLocalNoon(now);
        const times = SunCalc.getTimes(calcDate, coordinates.latitude, coordinates.longitude);
        const { sunrise, sunset } = times;

        if (!sunrise || !sunset || Number.isNaN(sunrise.getTime()) || Number.isNaN(sunset.getTime())) {
            daylightCache.set(cacheKey, null);
            return null;
        }

        const daylightWindow: DaylightWindow = { sunrise, sunset };
        daylightCache.set(cacheKey, daylightWindow);
        return daylightWindow;
    } catch {
        daylightCache.set(cacheKey, null);
        return null;
    }
}

// Exposed for tests to ensure deterministic cache behavior.
export function clearDaylightCache() {
    daylightCache.clear();
}
