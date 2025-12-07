export const ROOM_WIDTH = 1920;
export const ROOM_HEIGHT = 1080;

export const BASE_BACKGROUND_DAY = "/backgrounds/snow-background-day.svg";
export const BASE_BACKGROUND_NIGHT = "/backgrounds/snow-background-night.svg";

const DAYTIME_START_HOUR = 6;
const NIGHTTIME_START_HOUR = 18;

export function getLocalTimeOfDayBackground(now = new Date()) {
    const hour = now.getHours();
    const isDaytime = hour >= DAYTIME_START_HOUR && hour < NIGHTTIME_START_HOUR;
    return isDaytime ? BASE_BACKGROUND_DAY : BASE_BACKGROUND_NIGHT;
}
