import { beforeEach, describe, expect, test } from "bun:test";
import { getLocalTimeOfDay } from "../src/room/roomConstants";
import { clearDaylightCache, getDaylightWindow } from "../src/room/timeOfDay";
import { getTimezoneCoordinates } from "../src/room/timezoneCoordinates";

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
