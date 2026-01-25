import { useEffect, useState } from "react";

interface GeoLocation {
    country: string;
    country_code: string;
}

const CACHE_KEY = "geo_location_cache";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CachedLocation {
    isUS: boolean;
    timestamp: number;
}

let inflightPromise: Promise<boolean> | null = null;

function getCachedLocation(): boolean | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cached: CachedLocation = JSON.parse(raw);
        if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return cached.isUS;
    } catch {
        return null;
    }
}

function setCachedLocation(isUS: boolean): void {
    try {
        const data: CachedLocation = { isUS, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch {
        // Ignore storage errors
    }
}

async function fetchLocation(): Promise<boolean> {
    const cached = getCachedLocation();
    if (cached !== null) return cached;

    if (inflightPromise) return inflightPromise;

    inflightPromise = (async () => {
        try {
            const response = await fetch("https://ipapi.co/json/");
            if (!response.ok) throw new Error("Failed to fetch location");
            const geo: GeoLocation = await response.json();
            const isUS = geo.country_code === "US";
            setCachedLocation(isUS);
            return isUS;
        } catch (error) {
            console.error("Failed to check user location:", error);
            return true; // Fail open
        } finally {
            inflightPromise = null;
        }
    })();

    return inflightPromise;
}

export function useIsUSLocation() {
    const [isUS, setIsUS] = useState<boolean | null>(() => getCachedLocation());
    const [isLoading, setIsLoading] = useState(() => getCachedLocation() === null);

    useEffect(() => {
        let cancelled = false;

        fetchLocation().then((result) => {
            if (!cancelled) {
                setIsUS(result);
                setIsLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, []);

    return { isUS, isLoading };
}
