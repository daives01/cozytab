import type { ReactNode } from "react";
import { X } from "lucide-react";

interface WindowFrameProps {
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    accent: string;
    isActive: boolean;
    onPointerDown: () => void;
    onClose: () => void;
    onStartDrag: (event: React.PointerEvent<HTMLDivElement>) => void;
    onStartResize: (event: React.PointerEvent<HTMLDivElement>) => void;
    children: ReactNode;
}

export function WindowFrame({
    id,
    title,
    x,
    y,
    width,
    height,
    zIndex,
    accent,
    isActive,
    onPointerDown,
    onClose,
    onStartDrag,
    onStartResize,
    children,
}: WindowFrameProps) {
    return (
        <div
            key={id}
            data-window
            className={`absolute pointer-events-auto rounded-xl shadow-2xl flex flex-col overflow-hidden bg-[var(--card)] transition-shadow ${
                isActive
                    ? "ring-2 ring-[color-mix(in_srgb,var(--chart-4)_35%,var(--primary-foreground))] border-2 border-[var(--ink)] shadow-[var(--shadow-ink-bold)]"
                    : "ring-1 ring-[var(--taskbar-border)] border-2 border-[color-mix(in_srgb,var(--ink)_40%,transparent)]"
            }`}
            style={{
                top: y,
                left: x,
                width,
                height,
                zIndex,
            }}
            onPointerDown={onPointerDown}
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className={`flex items-center justify-between px-3 py-2 text-white text-size-lg font-bold select-none bg-gradient-to-r ${accent} shadow-sm cursor-grab active:cursor-grabbing`}
                onPointerDown={onStartDrag}
            >
                <span className="truncate">{title}</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }}
                    className="w-7 h-7 flex items-center justify-center rounded-sm bg-white/20 hover:bg-[var(--danger)] hover:text-[var(--destructive-foreground)] border border-white/40"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>

            <div className="flex-1 bg-[color-mix(in_srgb,var(--card)_90%,transparent)] overflow-hidden p-2">{children}</div>

            <div
                className="absolute bottom-1 right-1 w-4 h-4 border-2 border-[color-mix(in_srgb,var(--ink)_30%,transparent)] bg-[color-mix(in_srgb,var(--taskbar-to)_80%,transparent)] rounded-sm cursor-se-resize"
                onPointerDown={onStartResize}
            />
        </div>
    );
}

