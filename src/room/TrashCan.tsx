import { useState, useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

    return (
        <div
            ref={trashRef}
            className="absolute bottom-4 left-4 z-50 pointer-events-auto"
        >
            <Button
                size="icon"
                variant={isHovered && draggedItemId ? "destructive" : "secondary"}
                className={`
                    h-12 w-12 rounded-full shadow-lg transition-all duration-200
                    ${isHovered && draggedItemId ? "scale-110 bg-red-500 hover:bg-red-600" : ""}
                `}
            >
                <Trash2
                    className={`
                        transition-all duration-200
                        ${isHovered && draggedItemId ? "w-6 h-6" : "w-5 h-5"}
                    `}
                />
            </Button>
        </div>
    );
}
