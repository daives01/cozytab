import { useState, useRef, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { RoomItem } from "../types";
import type { Doc } from "../../convex/_generated/dataModel";
import type React from "react";
import { AssetImage } from "../components/AssetImage";
import { FlipHorizontal2 } from "lucide-react";

interface ItemNodeProps {
    item: RoomItem;
    isSelected: boolean;
    mode: "view" | "edit";
    scale: number;
    onSelect: () => void;
    onChange: (item: RoomItem) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onComputerClick?: () => void;
    onMusicPlayerClick?: () => void;
    isOnboardingComputerTarget?: boolean;
    isVisitor?: boolean;
    overlay?: React.ReactNode;
}

export function ItemNode({
    item,
    isSelected,
    mode,
    scale,
    onSelect,
    onChange,
    onDragStart,
    onDragEnd,
    onComputerClick,
    onMusicPlayerClick,
    isOnboardingComputerTarget,
    isVisitor = false,
    overlay,
}: ItemNodeProps) {
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const itemStart = useRef({ x: 0, y: 0 });
    const catalogItems = useQuery(api.catalog.list);
    const catalogItem = catalogItems?.find((ci: Doc<"catalogItems">) => ci._id === item.catalogItemId || ci.name === item.catalogItemId);
    const imageUrl = catalogItem?.assetUrl || "";
    const resolvedWidth = catalogItem?.defaultWidth ?? 150;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (mode !== "edit") return;
        e.stopPropagation();
        e.preventDefault();

        onSelect();
        setIsDragging(true);
        onDragStart?.();

        dragStart.current = { x: e.clientX, y: e.clientY };
        itemStart.current = { x: item.x, y: item.y };
    };

    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            const dx = e.clientX - dragStart.current.x;
            const dy = e.clientY - dragStart.current.y;

            onChange({
                ...item,
                x: itemStart.current.x + dx / scale,
                y: itemStart.current.y + dy / scale,
            });
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            onDragEnd?.();
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, item, onChange, scale, onDragEnd]);

    const category = catalogItem?.category?.toLowerCase();
    const isComputerCategory = category?.includes("computer");
    const isMusicCategory = category?.includes("music");
    const hasUrl = Boolean(item.url);
    const isInteractable =
        mode === "view" &&
        (isVisitor
            ? hasUrl
            : Boolean(
                (isComputerCategory && onComputerClick) ||
                (isMusicCategory && onMusicPlayerClick) ||
                hasUrl
            ));

    const cursor =
        mode === "edit"
            ? "url('/cursor-drag.svg') 15 14, move"
            : isInteractable
                ? "url('/cursor-click.svg') 6 3, pointer"
                : "url('/cursor.svg') 6 3, auto";

    return (
        <div
            className="absolute select-none"
            data-onboarding={isComputerCategory && isOnboardingComputerTarget ? "placed-computer" : undefined}
            data-cozy-clickable={isInteractable ? "true" : undefined}
            style={{
                left: item.x,
                top: item.y,
                transform: "translate(-50%, -50%)",
                zIndex: 10,
                cursor,
            }}
            onMouseDown={handleMouseDown}
            onClick={(e) => {
                e.stopPropagation();
                if (mode !== "view" || !isInteractable) return;

                if (isVisitor && item.url) {
                    window.open(item.url, "_blank");
                    return;
                }

                if (isComputerCategory && onComputerClick) {
                    onComputerClick();
                    return;
                }

                if (isMusicCategory && onMusicPlayerClick) {
                    onMusicPlayerClick();
                    return;
                }

                if (item.url) {
                    window.open(item.url, "_blank");
                }
            }}
        >
            <div className="relative group" style={{ width: resolvedWidth }}>
                <div
                    className="w-full"
                    style={{
                        transform: item.flipped ? "scaleX(-1)" : "none",
                    }}
                >
                    {imageUrl ? (
                        <AssetImage
                            assetUrl={imageUrl}
                            alt="Room Item"
                            className="w-full h-auto object-contain select-none pointer-events-none drop-shadow-md"
                            style={{
                                filter: isSelected && mode === "edit" ? "drop-shadow(0 0 4px #3b82f6)" : "none",
                            }}
                        />
                    ) : (
                        <div className="w-full h-24 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-sm">
                            No Image
                        </div>
                    )}
                </div>

                {isSelected && mode === "edit" && (
                    <>
                        <div className="absolute inset-0 border-2 border-primary rounded-md pointer-events-none" />
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange({ ...item, flipped: !item.flipped });
                            }}
                            className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white border-2 border-[var(--ink)] rounded-full p-1.5 shadow-md hover:bg-[var(--muted)] transition-colors pointer-events-auto z-20"
                            title="Flip horizontally"
                        >
                            <FlipHorizontal2 className="w-4 h-4 text-[var(--ink)]" />
                        </button>
                    </>
                )}

                {overlay}
            </div>
        </div>
    );
}
