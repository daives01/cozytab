import { getTimes } from "suncalc";
import { beforeEach, describe, expect, test } from "bun:test";
import { getLocalTimeOfDay } from "../src/time/roomConstants";
import { clearDaylightCache, getDaylightWindow } from "../src/time/timeOfDay";
import { getTimezoneCoordinates } from "../src/time/timezoneCoordinates";

describe("time of day helpers", () => {
    beforeEach(() => {
        clearDaylightCache();
    });

    test("timezone coordinate lookup returns a representative point", () => {
        const coords = getTimezoneCoordinates("Europe/London");
        expect(coords).not.toBeNull();
        expect(coords?.latitude).toBeCloseTo(51.5, 1);
        expect(coords?.longitude).toBeCloseTo(-0.1, 1);
    });

    test("sunrise is earlier than sunset for a known timezone", () => {
        const now = new Date("2024-06-01T12:00:00Z");
        const daylight = getDaylightWindow(now, "America/New_York");
        expect(daylight).not.toBeNull();
        expect(daylight!.sunrise.getTime()).toBeLessThan(daylight!.sunset.getTime());
    });

    test("falls back to fixed hours when no daylight data exists", () => {
        const morning = new Date();
        morning.setHours(5, 0, 0, 0);
        expect(getLocalTimeOfDay(morning, "Invalid/Zone")).toBe("night");

        const midday = new Date();
        midday.setHours(10, 0, 0, 0);
        expect(getLocalTimeOfDay(midday, "Invalid/Zone")).toBe("day");

        const evening = new Date();
        evening.setHours(19, 0, 0, 0);
        expect(getLocalTimeOfDay(evening, "Invalid/Zone")).toBe("night");
    });
});

for (const [zone, instant] of [
    ["Asia/Tokyo", "2026-06-01T23:30:00Z"],
    ["America/Los_Angeles", "2026-06-01T02:30:00Z"],
    ["Pacific/Auckland", "2026-06-01T23:30:00Z"],
    ["America/New_York", "2026-03-08T06:30:00Z"],
    ["America/New_York", "2026-03-08T07:30:00Z"],
    ["America/New_York", "2026-11-01T05:30:00Z"],
    ["America/New_York", "2026-11-01T06:30:00Z"],
]) {
    test(`solar events belong to requested calendar day: ${zone} ${instant}`, () => {
        clearDaylightCache();
        const now = new Date(instant);
        const window = getDaylightWindow(now, zone);
        expect(window).not.toBeNull();

        if (!window) throw new Error("Expected ordinary daylight events");

        const calendar = new Intl.DateTimeFormat("en-CA", { timeZone: zone });
        expect(calendar.format(window.sunrise)).toBe(calendar.format(now));
        expect(calendar.format(window.sunset)).toBe(calendar.format(now));
        expect(window.sunrise.getTime()).toBeLessThan(window.sunset.getTime());
        expect(getLocalTimeOfDay(window.sunrise, zone)).toBe("day");
        expect(getLocalTimeOfDay(new Date(window.sunset.getTime() - 1), zone)).toBe("day");
        expect(getLocalTimeOfDay(window.sunset, zone)).toBe("night");
    });
}

test("polar missing events retain the fixed-hour fallback", () => {
    for (const instant of ["2026-06-21T12:00:00Z", "2026-12-21T12:00:00Z"]) {
        const now = new Date(instant);
        expect(getDaylightWindow(now, "Antarctica/Troll")).toBeNull();
        expect(getLocalTimeOfDay(now, "Antarctica/Troll")).toBe(getLocalTimeOfDay(now, "Invalid/Zone"));
    }
});

test("polar day and night expose nullable events and direction flags", () => {
    const summer = getTimes(new Date("2026-06-21T12:00:00Z"), 80, 0, 0, 0);
    const winter = getTimes(new Date("2026-12-21T12:00:00Z"), 80, 0, 0, 0);
    expect(summer.sunrise).toBeNull();
    expect(summer.sunset).toBeNull();
    expect(summer.alwaysUp).toBe(true);
    expect(winter.sunrise).toBeNull();
    expect(winter.sunset).toBeNull();
    expect(winter.alwaysDown).toBe(true);
});

test("invalid dates preserve the missing-daylight fallback", () => {
    expect(getDaylightWindow(new Date(NaN), "America/New_York")).toBeNull();
});
