import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent, TouchEvent } from "react";
import { Volume1, Volume2, VolumeX } from "lucide-react";

type VolumeSliderProps = {
    value: number;
    onChange: (val: number) => void;
};

export function NeoVolumeSlider({ value, onChange }: VolumeSliderProps) {
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleInteraction = useCallback(
        (clientX: number) => {
            if (!trackRef.current) return;
            const rect = trackRef.current.getBoundingClientRect();
            const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
            const percentage = x / rect.width;
            onChange(Math.max(0, Math.min(1, percentage)));
        },
        [onChange]
    );

    const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
        setIsDragging(true);
        handleInteraction(e.clientX);
    };

    const handleTouchStart = (e: TouchEvent<HTMLDivElement>) => {
        setIsDragging(true);
        handleInteraction(e.touches[0].clientX);
    };

    useEffect(() => {
        if (!isDragging) return;

        const onMove = (e: globalThis.MouseEvent) => handleInteraction(e.clientX);
        const onUp = () => setIsDragging(false);
        const onTouchMove = (e: globalThis.TouchEvent) => handleInteraction(e.touches[0].clientX);
        const onTouchEnd = () => setIsDragging(false);

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
        window.addEventListener("touchmove", onTouchMove);
        window.addEventListener("touchend", onTouchEnd);

        return () => {
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
            window.removeEventListener("touchmove", onTouchMove);
            window.removeEventListener("touchend", onTouchEnd);
        };
    }, [handleInteraction, isDragging]);

    const percentage = value * 100;
    const VolumeIcon = value === 0 ? VolumeX : value < 0.5 ? Volume1 : Volume2;

    return (
        <div className="flex w-full items-center gap-4 select-none font-sans">
            <button
                onClick={() => onChange(value === 0 ? 0.5 : 0)}
                className="group flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[4px_4px_0px_0px_var(--color-foreground)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_var(--color-foreground)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none"
                aria-label={value === 0 ? "Unmute" : "Mute"}
            >
                <VolumeIcon 
                    className={`h-6 w-6 text-[var(--color-foreground)] transition-all duration-300 ${value === 0 ? 'text-[var(--color-muted-foreground)]' : ''}`} 
                />
            </button>

            <div
                ref={trackRef}
                className="relative h-12 flex-1 cursor-pointer touch-none rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-muted)]/10 shadow-[4px_4px_0px_0px_var(--color-foreground)]"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
            >
                <div className="absolute inset-0 rounded-lg overflow-hidden">
                    
                    <div
                        className="absolute inset-y-0 left-0 bg-[var(--color-share-accent)] border-r-2 border-[var(--color-foreground)]"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
                <div
                    className="absolute top-0 bottom-0 w-6 -ml-3 z-10 flex items-center justify-center cursor-grab active:cursor-grabbing group"
                    style={{ left: `${percentage}%` }}
                >
                    <div className="h-8 w-4 rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-sm transition-transform group-active:scale-95 group-hover:scale-110 flex flex-col gap-1 items-center justify-center">
                         <div className="w-0.5 h-3 bg-[var(--color-foreground)]/20 rounded-full" />
                    </div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none mix-blend-plus-darker">
                    <span className="text-xs font-black font-mono tracking-widest text-[var(--color-foreground)]">
                        {Math.round(percentage)}%
                    </span>
                </div>
            </div>
        </div>
    );
}