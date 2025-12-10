import { useCallback, useEffect } from "react";

let audioCtx: AudioContext | null = null;
let audioUnlocked = false;
const unlockListeners = new Set<() => void>();

function createAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!audioCtx) {
        audioCtx = new Ctor();
    }
    return audioCtx;
}

function updateUnlockedState(ctx: AudioContext | null) {
    const nextUnlocked = Boolean(ctx && ctx.state === "running");
    if (nextUnlocked === audioUnlocked) return;
    audioUnlocked = nextUnlocked;
    if (audioUnlocked) {
        unlockListeners.forEach((listener) => listener());
    }
}

export function getAudioContext(): AudioContext | null {
    return createAudioContext();
}

export function isAudioUnlocked(): boolean {
    updateUnlockedState(audioCtx);
    return audioUnlocked;
}

export async function ensureAudioReady(): Promise<boolean> {
    const ctx = createAudioContext();
    if (!ctx) {
        updateUnlockedState(null);
        return false;
    }
    if (ctx.state !== "running") {
        try {
            await ctx.resume();
        } catch {
            // ignore resume errors; caller will treat as not ready
        }
    }
    updateUnlockedState(ctx);
    return audioUnlocked;
}

export function onAudioUnlocked(listener: () => void): () => void {
    unlockListeners.add(listener);
    return () => unlockListeners.delete(listener);
}

export function useAudioUnlock() {
    const requestUnlock = useCallback(() => {
        void ensureAudioReady();
    }, []);

    useEffect(() => {
        if (isAudioUnlocked()) return;
        if (typeof window === "undefined") return;
        const handleUserGesture = () => {
            requestUnlock();
        };

        window.addEventListener("pointerdown", handleUserGesture, { passive: true });
        window.addEventListener("touchstart", handleUserGesture, { passive: true });
        window.addEventListener("keydown", handleUserGesture);

        return () => {
            window.removeEventListener("pointerdown", handleUserGesture);
            window.removeEventListener("touchstart", handleUserGesture);
            window.removeEventListener("keydown", handleUserGesture);
        };
    }, [requestUnlock]);

    return { requestUnlock, audioUnlocked: isAudioUnlocked() };
}
