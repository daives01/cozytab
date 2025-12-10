import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { setTypingVolumeMultiplier } from "../lib/typingAudio";
import { debounce } from "@/lib/debounce";

const DEFAULT_ENABLED = true;
const DEFAULT_VOLUME = 0.5;
const listeners = new Set<() => void>();
let cachedEnabled = DEFAULT_ENABLED;
let cachedVolume = DEFAULT_VOLUME;

function updateCache(nextEnabled: boolean, nextVolume: number) {
    const clampedVolume = Math.max(0, Math.min(1, nextVolume));
    const changed = nextEnabled !== cachedEnabled || Math.abs(clampedVolume - cachedVolume) > 0.0001;
    cachedEnabled = nextEnabled;
    cachedVolume = clampedVolume;
    setTypingVolumeMultiplier(cachedVolume);
    if (!changed) return;
    listeners.forEach((listener) => listener());
}

// Ensure the audio controller respects the default volume on load.
updateCache(cachedEnabled, cachedVolume);

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function isKeyboardSoundEnabled(): boolean {
    return cachedEnabled;
}

export function getKeyboardSoundVolume(): number {
    return cachedVolume;
}

export function useKeyboardSoundPreferences() {
    const remote = useQuery(api.users.getKeyboardSoundSettings, {});
    const saveRemote = useMutation(api.users.saveKeyboardSoundSettings);
    const debouncedSaveRemote = useMemo(
        () =>
            debounce((nextEnabled: boolean, nextVolume: number) => {
                void saveRemote({ enabled: nextEnabled, volume: nextVolume });
            }, 250),
        [saveRemote]
    );

    const enabled = useSyncExternalStore(subscribe, () => cachedEnabled, () => cachedEnabled);
    const volume = useSyncExternalStore(subscribe, () => cachedVolume, () => cachedVolume);

    useEffect(() => {
        if (remote && remote.enabled !== undefined && remote.volume !== undefined) {
            updateCache(remote.enabled, remote.volume);
        } else if (remote === null) {
            updateCache(DEFAULT_ENABLED, DEFAULT_VOLUME);
        }
    }, [remote]);

    const canPersist = remote !== undefined && remote !== null;

    const setEnabled = useCallback(
        (next: boolean) => {
            const currentVolume = remote?.volume ?? cachedVolume;
            updateCache(next, currentVolume);
            if (canPersist) {
                void saveRemote({ enabled: next, volume: currentVolume });
            }
        },
        [canPersist, remote?.volume, saveRemote]
    );

    const setVolume = useCallback(
        (nextVolume: number) => {
            const clamped = Math.max(0, Math.min(1, nextVolume));
            const currentEnabled = remote?.enabled ?? cachedEnabled;
            updateCache(currentEnabled, clamped);
            if (canPersist) {
                debouncedSaveRemote(currentEnabled, clamped);
            }
        },
        [canPersist, debouncedSaveRemote, remote?.enabled]
    );

    return { enabled, volume, setEnabled, setVolume };
}

