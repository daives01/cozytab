import { getTimes } from "suncalc";
import { getResolvedTimeZone, getTimezoneCoordinates } from "./timezoneCoordinates";

export type DaylightWindow = {
    sunrise: Date;
    sunset: Date;
};

const daylightCache = new Map<string, DaylightWindow | null>();

function getCalendarParts(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);

    const calendarUtc = Date.UTC(
        value("year"),
        value("month") - 1,
        value("day"),
        value("hour"),
        value("minute"),
        value("second"),
    );

    return {
        key: `${timeZone}:${value("year")}-${value("month")}-${value("day")}`,
        offset: (calendarUtc - Math.floor(date.getTime() / 1000) * 1000) / 60000,
    };
}

export function getDaylightWindow(now = new Date(), timeZone?: string): DaylightWindow | null {
    const timeZoneId = timeZone ?? getResolvedTimeZone();

    if (!timeZoneId) return null;

    const coordinates = getTimezoneCoordinates(timeZoneId);

    if (!coordinates) return null;

    const calendar = getCalendarParts(now, timeZoneId);
    const cacheKey = calendar.key;
    const cached = daylightCache.get(cacheKey);

    if (cached !== undefined) return cached;

    try {
        const times = getTimes(now, coordinates.latitude, coordinates.longitude, 0, calendar.offset);
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
