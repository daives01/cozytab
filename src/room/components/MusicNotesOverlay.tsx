import { useMemo, type CSSProperties } from "react";
import { cn } from "../../lib/utils";

import musicNote1 from "/assets/music-note-1.svg?raw";
import musicNote2 from "/assets/music-note-2.svg?raw";
import musicNote3 from "/assets/music-note-3.svg?raw";

const NOTE_ASSETS = [musicNote1, musicNote2, musicNote3];

const MUSIC_NOTES_CONFIG = {
    count: 5,
    risePx: 88,
    wobblePx: 14,
    minDurationMs: 2400,
    maxDurationMs: 3400,
    maxDelayMs: 900,
    fadeOutMs: 260,
    minScale: 0.88,
    maxScale: 1.08,
    baseOpacity: 0.82,
    horizontalPaddingPercent: 14,
    minSizePx: 16,
    maxSizePx: 32,
};

type MusicNotesOverlayProps = {
    playing: boolean;
    seed: string;
    className?: string;
};

const createSeededRandom = (seed: string) => {
    let h = 2166136261 ^ seed.length;
    for (let i = 0; i < seed.length; i += 1) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return () => {
        h += h << 13;
        h ^= h >>> 7;
        h += h << 3;
        h ^= h >>> 17;
        h += h << 5;
        return (h >>> 0) / 4294967295;
    };
};

export function MusicNotesOverlay({ playing, seed, className }: MusicNotesOverlayProps) {
    const prefersReducedMotion = useMemo(
        () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        []
    );

    const notes = useMemo(() => {
        const rng = createSeededRandom(seed || "music-notes");
        const spread = 100 - MUSIC_NOTES_CONFIG.horizontalPaddingPercent * 2;
        const durationRange = MUSIC_NOTES_CONFIG.maxDurationMs - MUSIC_NOTES_CONFIG.minDurationMs;
        const scaleRange = MUSIC_NOTES_CONFIG.maxScale - MUSIC_NOTES_CONFIG.minScale;
        const sizeRange = MUSIC_NOTES_CONFIG.maxSizePx - MUSIC_NOTES_CONFIG.minSizePx;

        return Array.from({ length: MUSIC_NOTES_CONFIG.count }, (_, index) => {
            const left = MUSIC_NOTES_CONFIG.horizontalPaddingPercent + rng() * spread;
            const duration = MUSIC_NOTES_CONFIG.minDurationMs + rng() * durationRange;
            const delay = rng() * MUSIC_NOTES_CONFIG.maxDelayMs;
            const scale = MUSIC_NOTES_CONFIG.minScale + rng() * scaleRange;
            const wobble = (rng() - 0.5) * MUSIC_NOTES_CONFIG.wobblePx * 2;
            const rise = MUSIC_NOTES_CONFIG.risePx * (0.9 + rng() * 0.2);
            const opacity = MUSIC_NOTES_CONFIG.baseOpacity * (0.9 + rng() * 0.15);
            const size = MUSIC_NOTES_CONFIG.minSizePx + rng() * sizeRange;
            const asset = NOTE_ASSETS[index % NOTE_ASSETS.length];

            return { asset, left, duration, delay, scale, wobble, rise, opacity, size };
        });
    }, [seed]);

    if (prefersReducedMotion) return null;

    return (
        <div
            className={cn("pointer-events-none absolute left-0 right-0 overflow-visible", className)}
            style={{
                bottom: "100%",
                transform: "translateY(-4px)",
                opacity: playing ? 1 : 0,
                transition: `opacity ${MUSIC_NOTES_CONFIG.fadeOutMs}ms ease-in-out`,
            }}
            aria-hidden
        >
            {notes.map((note, index) => (
                <span
                    key={`note-${index}`}
                    className="absolute block text-[var(--ink)]"
                    style={{
                        left: `${note.left}%`,
                        bottom: 0,
                        width: `${note.size}px`,
                        height: `${note.size}px`,
                        opacity: note.opacity,
                        animationName: "cozy-note-float",
                        animationDuration: `${note.duration}ms`,
                        animationDelay: `${note.delay}ms`,
                        animationTimingFunction: "ease-in-out",
                        animationIterationCount: "infinite",
                        color: "black",
                        filter: "drop-shadow(1px 1px 0 var(--shadow-edge-soft))",
                        "--note-rise": `${-note.rise}px`,
                        "--note-wobble": `${note.wobble}px`,
                        "--note-scale": note.scale,
                        lineHeight: 0,
                    } as CSSProperties}
                    aria-hidden
                    dangerouslySetInnerHTML={{ __html: note.asset }}
                />
            ))}
        </div>
    );
}
