import { useState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";

interface TrashCanProps {
    draggedItemId: string | null;
    onDelete: (itemId: string) => void;
}

export function TrashCan({ draggedItemId, onDelete }: TrashCanProps) {
    const [isHovered, setIsHovered] = useState(false);
    const trashRef = useRef<HTMLDivElement>(null);
    const draggedItemIdRef = useRef<string | null>(null);

    // Keep ref in sync with prop
    useEffect(() => {
        draggedItemIdRef.current = draggedItemId;
    }, [draggedItemId]);

    useEffect(() => {
        if (!draggedItemId) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setIsHovered(false);
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            if (!trashRef.current) return;

            const rect = trashRef.current.getBoundingClientRect();
            const isOver = (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            );

            setIsHovered(isOver);
        };

        const handleMouseUp = (e: MouseEvent) => {
            // Use ref to get the current value, even if prop was cleared
            const currentItemId = draggedItemIdRef.current;
            if (!currentItemId || !trashRef.current) return;

            const rect = trashRef.current.getBoundingClientRect();
            const isOver = (
                e.clientX >= rect.left &&
                e.clientX <= rect.right &&
                e.clientY >= rect.top &&
                e.clientY <= rect.bottom
            );

            if (isOver) {
                onDelete(currentItemId);
            }
            setIsHovered(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp, true); // Use capture phase to run before ItemNode

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp, true);
        };
    }, [draggedItemId, onDelete]);

    const isActive = !!draggedItemId;
    
    return (
        <div
            ref={trashRef}
            className={`
                absolute bottom-6 left-6 z-50 pointer-events-auto transition-all duration-300
                ${isActive ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"}
            `}
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
