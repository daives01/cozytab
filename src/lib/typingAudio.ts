// Lightweight typing audio controller backed by downloaded audio assets.
// Provides simple play helpers and tweakable constants.

import { ensureAudioReady, getAudioContext, isAudioUnlocked } from "./audio";

export const TYPING_AUDIO_VOLUME = .5;
export const TYPING_AUDIO_MAX_SIMULTANEOUS = 4;
export const TYPING_AUDIO_THROTTLE_MS = 35;
export const TYPING_AUDIO_RATE_MIN = 0.85;
export const TYPING_AUDIO_RATE_MAX = 0.95;
export const TYPING_AUDIO_VOLUME_JITTER_MIN = 0.95;
export const TYPING_AUDIO_VOLUME_JITTER_MAX = 1.0;
let typingVolumeMultiplier = 1;

export function setTypingVolumeMultiplier(multiplier: number) {
    typingVolumeMultiplier = Math.max(0, Math.min(1, multiplier));
}

type SampleCategory = "key" | "enter" | "space" | "backspace";
type Phase = "down" | "up";

const SOUND_BASE = "/assets/sounds/alpacas";
const SAMPLE_PATHS: Record<Phase, Record<SampleCategory, string>> = {
    down: {
        key: `${SOUND_BASE}/key-down.mp3`,
        enter: `${SOUND_BASE}/enter-down.mp3`,
        space: `${SOUND_BASE}/space-down.mp3`,
        backspace: `${SOUND_BASE}/backspace-down.mp3`,
    },
    up: {
        key: `${SOUND_BASE}/key-up.mp3`,
        enter: `${SOUND_BASE}/enter-up.mp3`,
        space: `${SOUND_BASE}/space-up.mp3`,
        backspace: `${SOUND_BASE}/backspace-up.mp3`,
    },
};

const bufferCache = new Map<string, AudioBuffer>();
const lastPlayed = new Map<string, number>();
const activeSources = new Set<AudioBufferSourceNode>();

function randomInRange(min: number, max: number) {
    return min + Math.random() * (max - min);
}

async function loadBuffer(url: string): Promise<AudioBuffer | null> {
    if (bufferCache.has(url)) return bufferCache.get(url) ?? null;
    const ctx = getAudioContext();
    if (!ctx) return null;
    try {
        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();
        const decoded = await ctx.decodeAudioData(arrayBuffer);
        bufferCache.set(url, decoded);
        return decoded;
    } catch (err) {
        console.error("[TypingAudio] Failed to load buffer", url, err);
        bufferCache.set(url, null as unknown as AudioBuffer);
        return null;
    }
}

function shouldPlay(key: string): boolean {
    const now = performance.now();
    const last = lastPlayed.get(key) ?? 0;
    if (now - last < TYPING_AUDIO_THROTTLE_MS) return false;
    lastPlayed.set(key, now);
    return true;
}

function limitVoices() {
    if (activeSources.size < TYPING_AUDIO_MAX_SIMULTANEOUS) return;
    // Stop the oldest source to keep the mix clean.
    const [oldest] = activeSources;
    try {
        oldest.stop();
    } catch {
        // ignore
    }
}

async function playSample(path: string) {
    if (!isAudioUnlocked()) {
        const ready = await ensureAudioReady();
        if (!ready) return;
    }
    const ctx = getAudioContext();
    if (!ctx) return;
    if (!shouldPlay(path)) return;

    const buffer = await loadBuffer(path);
    if (!buffer) return;

    limitVoices();

    const source = ctx.createBufferSource();
    const gain = ctx.createGain();

    // Randomize pitch and micro-variations in level for more realism.
    source.playbackRate.value = randomInRange(TYPING_AUDIO_RATE_MIN, TYPING_AUDIO_RATE_MAX);

    gain.gain.value =
        TYPING_AUDIO_VOLUME * typingVolumeMultiplier * randomInRange(TYPING_AUDIO_VOLUME_JITTER_MIN, TYPING_AUDIO_VOLUME_JITTER_MAX);

    source.buffer = buffer;
    source.connect(gain).connect(ctx.destination);

    source.onended = () => {
        activeSources.delete(source);
    };

    activeSources.add(source);
    source.start();
}

function resolveCategory(key: string): SampleCategory {
    if (key === "Enter") return "enter";
    if (key === "Backspace") return "backspace";
    if (key === " " || key === "Spacebar") return "space";
    return "key";
}

function getPath(phase: Phase, key: string): string {
    const category = resolveCategory(key);
    return SAMPLE_PATHS[phase][category];
}

export function playKeyDown(key: string) {
    const path = getPath("down", key);
    void playSample(path);
}

export function playKeyUp(key: string) {
    const path = getPath("up", key);
    void playSample(path);
}

