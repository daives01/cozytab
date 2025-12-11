import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { setTypingVolumeMultiplier } from "@/lib/typingAudio";
import { debounce } from "@/lib/debounce";

type KeyboardSoundPrefs = { volume: number; musicVolume: number };

const DEFAULT_VOLUME = 0.5;
const DEFAULT_MUSIC_VOLUME = 0.7;
const STORAGE_KEY = "nook:keyboardSoundPrefs";
const listeners = new Set<() => void>();
let cachedVolume = DEFAULT_VOLUME;
let cachedMusicVolume = DEFAULT_MUSIC_VOLUME;

function clampVolume(value: unknown, fallback: number): number {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    return Math.max(0, Math.min(1, value));
}

function loadGuestPrefs(): KeyboardSoundPrefs | null {
    if (typeof window === "undefined") return null;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as Partial<{ volume: unknown; musicVolume: unknown }>;
        const volume = clampVolume(parsed.volume, DEFAULT_VOLUME);
        const musicVolume = clampVolume(parsed.musicVolume, DEFAULT_MUSIC_VOLUME);
        return { volume, musicVolume };
    } catch (err) {
        console.warn("[KeyboardSound] Failed to read guest prefs", err);
        return null;
    }
}

function saveGuestPrefs(volume: number, musicVolume: number) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ volume, musicVolume }));
    } catch (err) {
        console.warn("[KeyboardSound] Failed to persist guest prefs", err);
    }
}

function updateCache(nextVolume: number, nextMusicVolume = cachedMusicVolume) {
    const clampedVolume = clampVolume(nextVolume, DEFAULT_VOLUME);
    const clampedMusicVolume = clampVolume(nextMusicVolume, DEFAULT_MUSIC_VOLUME);
    const changed =
        Math.abs(clampedVolume - cachedVolume) > 0.0001 ||
        Math.abs(clampedMusicVolume - cachedMusicVolume) > 0.0001;
    cachedVolume = clampedVolume;
    cachedMusicVolume = clampedMusicVolume;
    setTypingVolumeMultiplier(cachedVolume);
    if (!changed) return;
    listeners.forEach((listener) => listener());
}

// Ensure the audio controller respects the default volume on load.
updateCache(cachedVolume, cachedMusicVolume);

function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function isKeyboardSoundEnabled(): boolean {
    return cachedVolume > 0.0001;
}

export function getKeyboardSoundVolume(): number {
    return cachedVolume;
}

export function useKeyboardSoundPreferences() {
    const remote = useQuery(api.users.getKeyboardSoundSettings, {});
    const saveRemote = useMutation(api.users.saveKeyboardSoundSettings);
    const saveMusicRemote = useMutation(api.users.saveMusicPlayerVolume);
    const debouncedSaveRemote = useMemo(
        () =>
            debounce((nextVolume: number, nextMusicVolume: number) => {
                void saveRemote({ volume: nextVolume, musicVolume: nextMusicVolume });
            }, 250),
        [saveRemote]
    );
    const debouncedSaveMusicRemote = useMemo(
        () => debounce((nextMusicVolume: number) => void saveMusicRemote({ volume: nextMusicVolume }), 250),
        [saveMusicRemote]
    );

    const volume = useSyncExternalStore(subscribe, () => cachedVolume, () => cachedVolume);
    const musicVolume = useSyncExternalStore(subscribe, () => cachedMusicVolume, () => cachedMusicVolume);

    const mode = remote === undefined ? "loading" : remote === null ? "guest" : "remote";

    useEffect(() => {
        if (mode === "remote" && remote) {
            updateCache(remote.volume ?? DEFAULT_VOLUME, remote.musicVolume ?? DEFAULT_MUSIC_VOLUME);
            return;
        }
        if (mode === "guest") {
            const stored = loadGuestPrefs();
            if (stored) {
                updateCache(stored.volume, stored.musicVolume);
            } else {
                updateCache(DEFAULT_VOLUME, DEFAULT_MUSIC_VOLUME);
            }
        }
    }, [mode, remote]);

    const persist = useCallback(
        (next: KeyboardSoundPrefs, kind: "volume" | "music") => {
            updateCache(next.volume, next.musicVolume);
            if (mode === "remote") {
                if (kind === "music") {
                    debouncedSaveMusicRemote(next.musicVolume);
                } else {
                    debouncedSaveRemote(next.volume, next.musicVolume);
                }
            } else if (mode === "guest") {
                saveGuestPrefs(next.volume, next.musicVolume);
            }
        },
        [debouncedSaveMusicRemote, debouncedSaveRemote, mode]
    );

    const setEnabled = useCallback(
        (nextEnabled: boolean) => {
            const targetVolume = nextEnabled ? DEFAULT_VOLUME : 0;
            persist({ volume: targetVolume, musicVolume: cachedMusicVolume }, "volume");
        },
        [persist]
    );

    const setVolume = useCallback(
        (nextVolume: number) => {
            const clampedVolume = clampVolume(nextVolume, DEFAULT_VOLUME);
            persist({ volume: clampedVolume, musicVolume: cachedMusicVolume }, "volume");
        },
        [persist]
    );

    const setMusicVolume = useCallback(
        (nextVolume: number) => {
            const clampedMusic = clampVolume(nextVolume, DEFAULT_MUSIC_VOLUME);
            persist({ volume: cachedVolume, musicVolume: clampedMusic }, "music");
        },
        [persist]
    );

    return { enabled: isKeyboardSoundEnabled(), volume, musicVolume, setEnabled, setVolume, setMusicVolume };
}

