import { getDaylightWindow } from "./timeOfDay";

// 4:3 stage to reduce lateral guttering while keeping existing coordinates
export const ROOM_WIDTH = 1920;
export const ROOM_HEIGHT = 1440;

// Single unified fallback room illustration
export const ROOM_FALLBACK_BACKGROUND = "/assets/brown-room.svg";
export const BASE_BACKGROUND_DAY = "/backgrounds/snow-background-day.svg";
export const BASE_BACKGROUND_NIGHT = "/backgrounds/snow-background-night.svg";

export type TimeOfDay = "day" | "night";

const FALLBACK_DAYTIME_START_HOUR = 6;
const FALLBACK_NIGHTTIME_START_HOUR = 18;

export function getLocalTimeOfDay(now = new Date(), timeZone?: string): TimeOfDay {
    const daylightWindow = getDaylightWindow(now, timeZone);
    if (daylightWindow) {
        const nowMs = now.getTime();
        const isDaytime = nowMs >= daylightWindow.sunrise.getTime() && nowMs < daylightWindow.sunset.getTime();
        return isDaytime ? "day" : "night";
    }

    const hour = now.getHours();
    const isDaytime = hour >= FALLBACK_DAYTIME_START_HOUR && hour < FALLBACK_NIGHTTIME_START_HOUR;
    return isDaytime ? "day" : "night";
}

export function getLocalTimeOfDayBackground(now = new Date(), timeZone?: string) {
    const timeOfDay = getLocalTimeOfDay(now, timeZone);
    return timeOfDay === "day" ? BASE_BACKGROUND_DAY : BASE_BACKGROUND_NIGHT;
}
