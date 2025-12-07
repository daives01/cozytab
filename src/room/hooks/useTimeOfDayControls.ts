import { useTimeOfDay } from "./useTimeOfDay";

export function useTimeOfDayControls() {
    const { timeOfDay, overrideTimeOfDay, setOverrideTimeOfDay } = useTimeOfDay();
    return { timeOfDay, overrideTimeOfDay, setOverrideTimeOfDay };
}
