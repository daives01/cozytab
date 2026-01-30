import { useState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

interface TrashCanProps {
    draggedItemId: string | null;
    onDelete: (itemId: string) => void;
    offsetLeft?: number;
    offsetBottom?: number;
}

export function TrashCan({ draggedItemId, onDelete, offsetLeft = 0, offsetBottom = 0 }: TrashCanProps) {
    const [isHovered, setIsHovered] = useState(false);
    const [shouldShow, setShouldShow] = useState(false);
    const trashRef = useRef<HTMLDivElement>(null);
    const draggedItemIdRef = useRef<string | null>(null);
    const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const baseLeft = 24;
    const leftPosition = baseLeft + offsetLeft;
    const baseBottom = 24;
    const bottomPosition = baseBottom + offsetBottom;

    useEffect(() => {
        draggedItemIdRef.current = draggedItemId;
    }, [draggedItemId]);

    useEffect(() => {
        if (!draggedItemId) return;

        const timeoutId = setTimeout(() => setShouldShow(true), 100);
        showTimeoutRef.current = timeoutId;

        return () => {
            if (showTimeoutRef.current) {
                clearTimeout(showTimeoutRef.current);
                showTimeoutRef.current = null;
            }
            setShouldShow(false);
            setIsHovered(false);
        };
    }, [draggedItemId]);

    useEffect(() => {
        if (!draggedItemId) {
            return;
        }

        const checkTrashHover = (clientX: number, clientY: number): boolean => {
            if (!trashRef.current) return false;
            const rect = trashRef.current.getBoundingClientRect();
            return (
                clientX >= rect.left &&
                clientX <= rect.right &&
                clientY >= rect.top &&
                clientY <= rect.bottom
            );
        };

        const handleMouseMove = (e: MouseEvent) => {
            setIsHovered(checkTrashHover(e.clientX, e.clientY));
        };

        const handleMouseUp = (e: MouseEvent) => {
            // Use ref to get the current value, even if prop was cleared
            const currentItemId = draggedItemIdRef.current;
            if (!currentItemId) return;

            if (checkTrashHover(e.clientX, e.clientY)) {
                onDelete(currentItemId);
            }
            setIsHovered(false);
            setShouldShow(false);

            if (showTimeoutRef.current) {
                clearTimeout(showTimeoutRef.current);
                showTimeoutRef.current = null;
            }
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (e.pointerType !== "touch") return;
            setIsHovered(checkTrashHover(e.clientX, e.clientY));
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (e.pointerType !== "touch") return;
            const currentItemId = draggedItemIdRef.current;
            if (!currentItemId) return;

            if (checkTrashHover(e.clientX, e.clientY)) {
                onDelete(currentItemId);
            }
            setIsHovered(false);
            setShouldShow(false);

            if (showTimeoutRef.current) {
                clearTimeout(showTimeoutRef.current);
                showTimeoutRef.current = null;
            }
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp, true); // Use capture phase to run before ItemNode
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp, true);
        window.addEventListener("pointercancel", handlePointerUp, true);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp, true);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp, true);
            window.removeEventListener("pointercancel", handlePointerUp, true);
        };
    }, [draggedItemId, onDelete]);

    const isActive = shouldShow;
    
    return (
        <div
            ref={trashRef}
            className={`
                absolute z-50 pointer-events-auto transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]
                ${isActive ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"}
            `}
            style={{
                left: `${leftPosition}px`,
                bottom: `${bottomPosition}px`,
            }}
        >
            <div 
                className={`
                   relative flex items-center justify-center
                   transition-transform duration-200 ease-out
                   ${isHovered ? "scale-125 rotate-6" : "scale-100"}
                `}
            >
                {/* Visual Circle Background */}
                <div className={`
                    w-16 h-16 rounded-full border-2 shadow-md flex items-center justify-center bg-white
                    ${isHovered ? "border-[var(--danger)] bg-[var(--danger-light)]" : "border-[var(--ink)]"}
                `}>
                   <Trash2 
                       className={`
                           w-8 h-8 transition-colors
                           ${isHovered ? "text-[var(--danger)]" : "text-[var(--ink)]"}
                       `} 
                   />
                </div>

                {/* Text Label styling */}
                <div className={`
                    absolute -top-8 bg-[var(--ink)] text-white text-xs px-2 py-1 rounded-lg border-2 border-[var(--ink)] shadow-sm font-['Patrick_Hand'] whitespace-nowrap
                    transition-opacity duration-200
                    ${isHovered ? "opacity-100" : "opacity-0"}
                `}>
                    Release to delete
                </div>
            </div>
        </div>
    );
}
