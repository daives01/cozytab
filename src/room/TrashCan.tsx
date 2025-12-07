import { useEffect, useRef, useState } from "react";
import { Trash2 } from "lucide-react";

interface TrashCanProps {
    draggedItemId: string | null;
    onDelete: (itemId: string) => void;
    offsetLeft?: number;
    offsetBottom?: number;
}

const LONG_PRESS_DELAY_MS = 100;
const BASE_LEFT = 24;
const BASE_BOTTOM = 24;

export function TrashCan({ draggedItemId, onDelete, offsetLeft = 0, offsetBottom = 0 }: TrashCanProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [isVisible, setIsVisible] = useState(false);
    const trashRef = useRef<HTMLDivElement>(null);
    const draggedItemIdRef = useRef<string | null>(null);
    const showTimerRef = useRef<number | null>(null);

    const clearShowTimer = () => {
        if (showTimerRef.current !== null) {
            window.clearTimeout(showTimerRef.current);
            showTimerRef.current = null;
        }
    };

    const isPointerInside = (e: MouseEvent) => {
        const rect = trashRef.current?.getBoundingClientRect();
        if (!rect) return false;

        return (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
        );
    };

    useEffect(() => {
        draggedItemIdRef.current = draggedItemId;
    }, [draggedItemId]);

    useEffect(() => {
        clearShowTimer();
        if (!draggedItemId) {
            return () => {
                setIsVisible(false);
                setIsHovered(false);
            };
        }

        showTimerRef.current = window.setTimeout(() => {
            if (draggedItemIdRef.current) {
                setIsVisible(true);
            }
        }, LONG_PRESS_DELAY_MS);

        return () => {
            clearShowTimer();
            setIsVisible(false);
            setIsHovered(false);
        };
    }, [draggedItemId]);

    useEffect(() => {
        if (!draggedItemId) return;

        const hideNow = () => {
            clearShowTimer();
            setIsVisible(false);
            setIsHovered(false);
        };

        const handleMouseMove = (e: MouseEvent) => {
            setIsHovered(isPointerInside(e));
        };

        const handleMouseUp = (e: MouseEvent) => {
            const currentItemId = draggedItemIdRef.current;
            if (!currentItemId) {
                hideNow();
                return;
            }

            if (isPointerInside(e)) {
                onDelete(currentItemId);
            }

            hideNow();
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp, true);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp, true);
            hideNow();
        };
    }, [draggedItemId, onDelete]);

    const isActive = !!draggedItemId && isVisible;

    return (
        <div
            ref={trashRef}
            className={`
                absolute z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isActive ? "translate-y-0 opacity-100 pointer-events-auto" : "translate-y-20 opacity-0 pointer-events-none"}
            `}
            style={{
                transitionDelay: isActive ? "120ms" : "0ms",
                left: `${BASE_LEFT + offsetLeft}px`,
                bottom: `${BASE_BOTTOM + offsetBottom}px`,
            }}
        >
            <div
                className={`
                    relative flex items-center justify-center
                    transition-transform duration-200 ease-out
                    ${isHovered ? "scale-125 rotate-6" : "scale-100"}
                `}
            >
                <div
                    className={`
                        w-16 h-16 rounded-full border-2 shadow-md flex items-center justify-center bg-white
                        ${isHovered ? "border-[var(--danger)] bg-[var(--danger-light)]" : "border-[var(--ink)]"}
                    `}
                >
                    <Trash2
                        className={`
                            w-8 h-8 transition-colors
                            ${isHovered ? "text-[var(--danger)]" : "text-[var(--ink)]"}
                        `}
                    />
                </div>

                <div
                    className={`
                        absolute -top-8 bg-[var(--ink)] text-white text-xs px-2 py-1 rounded-lg border-2 border-[var(--ink)] shadow-sm font-['Patrick_Hand'] whitespace-nowrap
                        transition-opacity duration-200
                        ${isHovered ? "opacity-100" : "opacity-0"}
                    `}
                >
                    Release to delete
                </div>
            </div>
        </div>
    );
}
