import { ZoomIn } from "lucide-react";
import type { ZoomLevel } from "../hooks/useMobileZoom";
import { useTouchOnly } from "@/hooks/useTouchCapability";

interface MobileZoomButtonProps {
    zoomLevel: ZoomLevel;
    zoomLabel: string;
    onCycleZoom: () => void;
}

export function MobileZoomButton({ zoomLevel, zoomLabel, onCycleZoom }: MobileZoomButtonProps) {
    const isTouchOnly = useTouchOnly();

    if (!isTouchOnly) return null;

    return (
        <button
            type="button"
            onClick={onCycleZoom}
            className={`
                fixed bottom-4 right-4 z-50
                h-12 min-w-12 px-3
                flex items-center justify-center gap-1.5
                rounded-xl border-2 border-[var(--color-foreground)]
                bg-[var(--color-background)]
                shadow-[4px_4px_0px_0px_var(--color-foreground)]
                active:translate-x-[4px] active:translate-y-[4px] active:shadow-none
                transition-all duration-100
                ${zoomLevel > 1 ? "bg-[var(--color-accent)]" : ""}
            `}
            aria-label={`Zoom: ${zoomLabel}. Tap to change.`}
        >
            <ZoomIn className="h-5 w-5" />
            <span className="text-sm font-bold tabular-nums">{zoomLabel}</span>
        </button>
    );
}
