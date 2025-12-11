export type Coordinates = {
    latitude: number;
    longitude: number;
};

const TIMEZONE_COORDINATES: Record<string, Coordinates> = {
    "Africa/Cairo": { latitude: 30.0444, longitude: 31.2357 },
    "Africa/Johannesburg": { latitude: -26.2041, longitude: 28.0473 },
    "Africa/Lagos": { latitude: 6.5244, longitude: 3.3792 },
    "America/Anchorage": { latitude: 61.2181, longitude: -149.9003 },
    "America/Bogota": { latitude: 4.711, longitude: -74.0721 },
    "America/Chicago": { latitude: 41.8781, longitude: -87.6298 },
    "America/Denver": { latitude: 39.7392, longitude: -104.9903 },
    "America/Halifax": { latitude: 44.6488, longitude: -63.5752 },
    "America/Los_Angeles": { latitude: 34.0522, longitude: -118.2437 },
    "America/New_York": { latitude: 40.7128, longitude: -74.006 },
    "America/Phoenix": { latitude: 33.4484, longitude: -112.074 },
    "America/Sao_Paulo": { latitude: -23.5505, longitude: -46.6333 },
    "Asia/Bangkok": { latitude: 13.7563, longitude: 100.5018 },
    "Asia/Dubai": { latitude: 25.2048, longitude: 55.2708 },
    "Asia/Hong_Kong": { latitude: 22.3193, longitude: 114.1694 },
    "Asia/Kolkata": { latitude: 22.5726, longitude: 88.3639 },
    "Asia/Seoul": { latitude: 37.5665, longitude: 126.978 },
    "Asia/Shanghai": { latitude: 31.2304, longitude: 121.4737 },
    "Asia/Tokyo": { latitude: 35.6762, longitude: 139.6503 },
    "Atlantic/Azores": { latitude: 37.7412, longitude: -25.6756 },
    "Australia/Perth": { latitude: -31.9523, longitude: 115.8613 },
    "Australia/Sydney": { latitude: -33.8688, longitude: 151.2093 },
    "Europe/Berlin": { latitude: 52.52, longitude: 13.405 },
    "Europe/London": { latitude: 51.5074, longitude: -0.1278 },
    "Europe/Madrid": { latitude: 40.4168, longitude: -3.7038 },
    "Europe/Moscow": { latitude: 55.7558, longitude: 37.6173 },
    "Europe/Paris": { latitude: 48.8566, longitude: 2.3522 },
    "Pacific/Auckland": { latitude: -36.8485, longitude: 174.7633 },
};

const REGION_FALLBACKS: Record<string, Coordinates> = {
    Africa: { latitude: 1, longitude: 17 },
    America: { latitude: 39.5, longitude: -98.35 },
    Antarctica: { latitude: -75, longitude: 0 },
    Arctic: { latitude: 66, longitude: 0 },
    Asia: { latitude: 29, longitude: 89 },
    Atlantic: { latitude: 36, longitude: -25 },
    Australia: { latitude: -25, longitude: 133 },
    Europe: { latitude: 50, longitude: 14 },
    Indian: { latitude: -20, longitude: 80 },
    Pacific: { latitude: -8, longitude: -140 },
};

export function getResolvedTimeZone(): string | undefined {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function getTimezoneCoordinates(timeZone = getResolvedTimeZone()): Coordinates | null {
    if (!timeZone) return null;
    const directHit = TIMEZONE_COORDINATES[timeZone];
    if (directHit) return directHit;

    const region = timeZone.split("/")[0];
    const regionFallback = REGION_FALLBACKS[region];
    if (regionFallback) return regionFallback;

    return null;
}
