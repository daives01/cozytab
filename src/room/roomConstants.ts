// 4:3 stage to reduce lateral guttering while keeping existing coordinates
export const ROOM_WIDTH = 1920;
export const ROOM_HEIGHT = 1440;

export const BASE_BACKGROUND_DAY = "/backgrounds/snow-background-day.svg";
export const BASE_BACKGROUND_NIGHT = "/backgrounds/snow-background-night.svg";

export type TimeOfDay = "day" | "night";

const DAYTIME_START_HOUR = 6;
const NIGHTTIME_START_HOUR = 18;

export function getLocalTimeOfDay(now = new Date()): TimeOfDay {
    const hour = now.getHours();
    const isDaytime = hour >= DAYTIME_START_HOUR && hour < NIGHTTIME_START_HOUR;
    return isDaytime ? "day" : "night";
}

export function getLocalTimeOfDayBackground(now = new Date()) {
    const timeOfDay = getLocalTimeOfDay(now);
    return timeOfDay === "day" ? BASE_BACKGROUND_DAY : BASE_BACKGROUND_NIGHT;
}
