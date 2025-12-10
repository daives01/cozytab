import { useEffect, useRef } from "react";

import { playKeyDown, playKeyUp } from "@/lib/typingAudio";
import { useKeyboardSoundPreferences } from "./useKeyboardSoundSetting";

// Listens for local keyboard events and plays typing sounds globally.
export function useGlobalTypingSounds() {
    const { enabled } = useKeyboardSoundPreferences();
    const enabledRef = useRef(enabled);

    useEffect(() => {
        enabledRef.current = enabled;
    }, [enabled]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!enabledRef.current || e.repeat) return;
            playKeyDown(e.key);
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            if (!enabledRef.current) return;
            playKeyUp(e.key);
        };

        window.addEventListener("keydown", handleKeyDown);
        window.addEventListener("keyup", handleKeyUp);

        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("keyup", handleKeyUp);
        };
    }, []);
}
