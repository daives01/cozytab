import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { setTypingVolumeMultiplier } from "../lib/typingAudio";
import { debounce } from "@/lib/debounce";

type KeyboardSoundPrefs = { enabled: boolean; volume: number };

const DEFAULT_ENABLED = true;
const DEFAULT_VOLUME = 0.5;
const STORAGE_KEY = "nook:keyboardSoundPrefs";
const listeners = new Set<() => void>();
let cachedEnabled = DEFAULT_ENABLED;
let cachedVolume = DEFAULT_VOLUME;

function clampVolume(value: unknown, fallback = DEFAULT_VOLUME): number {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    return Math.max(0, Math.min(1, value));
}

function loadGuestPrefs(): KeyboardSoundPrefs | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<{ enabled: unknown; volume: unknown }>;
        const enabled = typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULT_ENABLED;
        const volume = clampVolume(parsed.volume, DEFAULT_VOLUME);
        return { enabled, volume };
    } catch (err) {
        console.warn("[KeyboardSound] Failed to read guest prefs", err);
        return null;
    }
}

function saveGuestPrefs(enabled: boolean, volume: number) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled, volume }));
    } catch (err) {
        console.warn("[KeyboardSound] Failed to persist guest prefs", err);
    }
}

function updateCache(nextEnabled: boolean, nextVolume: number) {
    const clampedVolume = clampVolume(nextVolume, DEFAULT_VOLUME);
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

    const mode = remote === undefined ? "loading" : remote === null ? "guest" : "remote";

    useEffect(() => {
        if (mode === "remote" && remote) {
            updateCache(remote.enabled ?? DEFAULT_ENABLED, remote.volume ?? DEFAULT_VOLUME);
            return;
        }
        if (mode === "guest") {
            const stored = loadGuestPrefs();
            if (stored) {
                updateCache(stored.enabled, stored.volume);
            } else {
                updateCache(DEFAULT_ENABLED, DEFAULT_VOLUME);
            }
        }
    }, [mode, remote]);

    const persist = useCallback(
        (next: KeyboardSoundPrefs, kind: "toggle" | "volume") => {
            updateCache(next.enabled, next.volume);
            if (mode === "remote") {
                if (kind === "toggle") {
                    void saveRemote({ enabled: next.enabled, volume: next.volume });
                } else {
                    debouncedSaveRemote(next.enabled, next.volume);
                }
            } else if (mode === "guest") {
                saveGuestPrefs(next.enabled, next.volume);
            }
        },
        [debouncedSaveRemote, mode, saveRemote]
    );

    const setEnabled = useCallback(
        (nextEnabled: boolean) => {
            const currentVolume = remote?.volume ?? cachedVolume;
            persist({ enabled: nextEnabled, volume: currentVolume }, "toggle");
        },
        [persist, remote?.volume]
    );

    const setVolume = useCallback(
        (nextVolume: number) => {
            const clampedVolume = clampVolume(nextVolume, DEFAULT_VOLUME);
            const currentEnabled = remote?.enabled ?? cachedEnabled;
            persist({ enabled: currentEnabled, volume: clampedVolume }, "volume");
        },
        [persist, remote?.enabled]
    );

    return { enabled, volume, setEnabled, setVolume };
}

