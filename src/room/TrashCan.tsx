import { useState } from "react";
import { Trash2 } from "lucide-react";

interface TrashCanProps {
    onDragOver: (isOver: boolean) => void;
    onDrop: () => void;
    isActive: boolean;
}

export function TrashCan({ onDragOver, onDrop, isActive }: TrashCanProps) {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
        onDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        onDragOver(false);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        onDragOver(false);
        onDrop();
    };

    if (!isActive) return null;

    return (
        <div
            className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50 pointer-events-auto transition-all duration-200"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            <div
                className={`
                    flex items-center justify-center
                    w-24 h-24 rounded-2xl
                    border-4 border-dashed
                    transition-all duration-200
                    shadow-2xl
                    ${isDragOver
                        ? "bg-red-500 border-red-300 scale-110"
                        : "bg-red-400/90 border-red-200"
                    }
                `}
            >
                <Trash2
                    className={`
                        transition-all duration-200
                        ${isDragOver ? "w-14 h-14 text-white" : "w-12 h-12 text-white/90"}
                    `}
                />
            </div>
            {isDragOver && (
                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 text-white font-bold text-lg whitespace-nowrap bg-red-500 px-4 py-2 rounded-lg shadow-lg">
                    Drop to Delete
                </div>
            )}
        </div>
    );
}
