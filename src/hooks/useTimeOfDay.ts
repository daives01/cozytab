import { useEffect, useRef } from "react";
import { atom, useAtom, useAtomValue, useSetAtom } from "jotai";
import { getLocalTimeOfDay } from "@/time/roomConstants";
import type { TimeOfDay } from "../types";

const timeOfDayActualAtom = atom<TimeOfDay>(getLocalTimeOfDay());
const timeOfDayOverrideAtom = atom<TimeOfDay | null>(null);
const timeOfDayEffectiveAtom = atom((get) => get(timeOfDayOverrideAtom) ?? get(timeOfDayActualAtom));

export function useTimeOfDay() {
    const [, setActualTimeOfDay] = useAtom(timeOfDayActualAtom);
    const [overrideTimeOfDay, setOverrideTimeOfDay] = useAtom(timeOfDayOverrideAtom);
    const effectiveTimeOfDay = useAtomValue(timeOfDayEffectiveAtom);
    const hasStarted = useRef(false);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;
        const tick = () => setActualTimeOfDay(getLocalTimeOfDay());
        tick();
        const id = setInterval(tick, 60_000);
        return () => clearInterval(id);
    }, [setActualTimeOfDay]);

    useEffect(() => {
        const root = document.documentElement;
        root.classList.toggle("night-mode", effectiveTimeOfDay === "night");
        return () => root.classList.remove("night-mode");
    }, [effectiveTimeOfDay]);

    return {
        timeOfDay: effectiveTimeOfDay,
        overrideTimeOfDay,
        setOverrideTimeOfDay,
        setActualTimeOfDay,
    };
}

export function useSetTimeOfDayOverride() {
    return useSetAtom(timeOfDayOverrideAtom);
}

export function useTimeOfDayValue() {
    return useAtomValue(timeOfDayEffectiveAtom);
}
