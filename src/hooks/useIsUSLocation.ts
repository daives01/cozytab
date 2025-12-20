import { useEffect, useState } from "react";

interface GeoLocation {
    country: string;
    country_code: string;
}

export function useIsUSLocation() {
    const [isUS, setIsUS] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function checkLocation() {
            try {
                const response = await fetch("https://ipapi.co/json/");
                if (!response.ok) {
                    throw new Error("Failed to fetch location");
                }
                const geo: GeoLocation = await response.json();
                if (!cancelled) {
                    setIsUS(geo.country_code === "US");
                    setIsLoading(false);
                }
            } catch (error) {
                console.error("Failed to check user location:", error);
                // On error, default to allowing (fail open) to avoid blocking legitimate users
                if (!cancelled) {
                    setIsUS(true);
                    setIsLoading(false);
                }
            }
        }

        checkLocation();

        return () => {
            cancelled = true;
        };
    }, []);

    return { isUS, isLoading };
}
