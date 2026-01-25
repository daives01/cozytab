import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, TouchEvent } from "react";

type VolumeSliderProps = {
    value: number;
    onChange: (val: number) => void;
    muted?: boolean;
    height?: number; // pixel height override
};

export function RetroVolumeFader({ value, onChange, muted = false, height }: VolumeSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const rafRef = useRef<number | null>(null);
    const lastClientY = useRef<number | null>(null);

    const clamp = (next: number) => Math.max(0, Math.min(1, next));

    const runInteraction = useCallback(() => {
        if (!trackRef.current || lastClientY.current === null) {
            rafRef.current = null;
            return;
        }
        const rect = trackRef.current.getBoundingClientRect();
        const y = Math.max(rect.top, Math.min(lastClientY.current, rect.bottom));
        const percentage = 1 - (y - rect.top) / rect.height;
        onChange(clamp(percentage));
        rafRef.current = null;
    }, [onChange]);

    const handleInteraction = useCallback(
        (clientY: number) => {
            lastClientY.current = clientY;
            if (rafRef.current === null) {
                rafRef.current = window.requestAnimationFrame(runInteraction);
            }
        },
        [runInteraction]
    );

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
        handleInteraction(e.clientY);
    };

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        e.preventDefault();
        setIsDragging(true);
        handleInteraction(e.touches[0].clientY);
    };

    useEffect(() => {
        if (!isDragging) return;

        const onMove = (e: globalThis.MouseEvent) => handleInteraction(e.clientY);
        const onUp = () => setIsDragging(false);
        const onTouchMove = (e: globalThis.TouchEvent) => handleInteraction(e.touches[0].clientY);
        const onTouchEnd = () => setIsDragging(false);

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onTouchMove, { passive: true });
        window.addEventListener("touchend", onTouchEnd, { passive: true });

        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        };
    }, [handleInteraction, isDragging]);

    useEffect(
        () => () => {
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
        },
        []
    );

    const percentage = Math.round(clamp(value) * 100);

    const containerHeight = height ?? 128; // default 8rem similar to h-32

    return (
        <div className="relative flex w-12 justify-center py-2 select-none" style={{ height: containerHeight }}>
            <div
                ref={trackRef}
                className={`relative h-full w-4 cursor-pointer touch-none rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-muted)]/20 shadow-[inset_1px_1px_2px_rgba(0,0,0,0.1)] ${
                    muted ? "opacity-60" : ""
                }`}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                aria-label="Volume fader"
                role="slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
            >
                <div
                    className="absolute bottom-0 w-full rounded-b-full bg-emerald-400 border-[var(--color-foreground)] border-t-0 opacity-90"
                    style={{ height: `${percentage}%` }}
                />
                <div
                    className="absolute left-1/2 z-10 h-5 w-8 -translate-x-1/2 cursor-grab active:cursor-grabbing"
                    style={{ bottom: `calc(${percentage}% - 10px)` }}
                >
                    <div className="flex h-full w-full items-center justify-center rounded-sm border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] transition-transform hover:scale-105 active:scale-95 active:shadow-none">
                        <div className="h-[2px] w-4 rounded-full bg-[var(--color-foreground)] opacity-30" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export { RetroVolumeFader as NeoVolumeSlider };