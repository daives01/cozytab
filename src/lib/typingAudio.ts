// Lightweight typing audio controller backed by downloaded WAV assets.
// Provides simple play helpers and tweakable constants.

import { ensureAudioReady, getAudioContext, isAudioUnlocked } from "./audio";

export const TYPING_AUDIO_VOLUME = 0.35;
export const TYPING_AUDIO_MAX_SIMULTANEOUS = 4;
export const TYPING_AUDIO_THROTTLE_MS = 35;
let typingVolumeMultiplier = 1;

export function setTypingVolumeMultiplier(multiplier: number) {
    typingVolumeMultiplier = Math.max(0, Math.min(1, multiplier));
}

type SampleCategory = "normal" | "enter" | "space";
type Phase = "down" | "up";

const SOUND_BASE = "/assets/sounds";
const SAMPLE_PATHS: Record<Phase, Record<SampleCategory, string>> = {
    down: {
        normal: `${SOUND_BASE}/normal-down.wav`,
        enter: `${SOUND_BASE}/enter-down.wav`,
        space: `${SOUND_BASE}/large-down.wav`,
    },
    up: {
        normal: `${SOUND_BASE}/normal-up.wav`,
        enter: `${SOUND_BASE}/enter-up.wav`,
        space: `${SOUND_BASE}/large-up.wav`,
    },
};

const bufferCache = new Map<string, AudioBuffer>();
const lastPlayed = new Map<string, number>();
const activeSources = new Set<AudioBufferSourceNode>();

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
    gain.gain.value = TYPING_AUDIO_VOLUME * typingVolumeMultiplier;

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
    if (key === " " || key === "Spacebar") return "space";
    return "normal";
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

