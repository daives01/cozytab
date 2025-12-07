const mountainFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Denver",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
});

type MountainParts = {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
    second: number;
};

function getMountainParts(timestamp: number): MountainParts {
    const parts = mountainFormatter.formatToParts(timestamp);
    const lookup: Record<string, number> = {};
    for (const part of parts) {
        if (part.type === "literal") continue;
        lookup[part.type] = Number(part.value);
    }
    return {
        year: lookup.year,
        month: lookup.month,
        day: lookup.day,
        hour: lookup.hour,
        minute: lookup.minute,
        second: lookup.second,
    };
}

export function getMountainDayKey(timestamp: number): string {
    const { year, month, day } = getMountainParts(timestamp);
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    return `${year}-${mm}-${dd}`;
}

function getMountainOffsetMs(timestamp: number): number {
    const { year, month, day, hour, minute, second } = getMountainParts(timestamp);
    const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
    return asUtc - timestamp;
}

export function getNextMountainMidnightUtc(timestamp: number): number {
    const offsetNow = getMountainOffsetMs(timestamp);
    const zoned = new Date(timestamp + offsetNow);
    zoned.setUTCHours(0, 0, 0, 0);
    zoned.setUTCDate(zoned.getUTCDate() + 1);
    const candidateLocalMs = zoned.getTime();
    const offsetAtCandidate = getMountainOffsetMs(candidateLocalMs - offsetNow);
    return candidateLocalMs - offsetAtCandidate;
}

function parseDayKey(dayKey: string): { year: number; month: number; day: number } | null {
    const [yearStr, monthStr, dayStr] = dayKey.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    if ([year, month, day].some((n) => Number.isNaN(n))) return null;
    return { year, month, day };
}

export function getDayDelta(prevDayKey: string | undefined, currentDayKey: string): number | null {
    if (!prevDayKey) return null;
    const prev = parseDayKey(prevDayKey);
    const current = parseDayKey(currentDayKey);
    if (!prev || !current) return null;
    const prevUtc = Date.UTC(prev.year, prev.month - 1, prev.day);
    const currentUtc = Date.UTC(current.year, current.month - 1, current.day);
    return Math.round((currentUtc - prevUtc) / (24 * 60 * 60 * 1000));
}
