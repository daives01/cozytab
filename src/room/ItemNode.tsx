import { useState, useRef, useEffect } from "react";
import type { RoomItem } from "@shared/guestTypes";
import type { Doc } from "@convex/_generated/dataModel";
import type React from "react";
import { AssetImage } from "../components/AssetImage";
import { ArrowDown, ArrowUp, FlipHorizontal2 } from "lucide-react";
import { useTouchOnly } from "@/hooks/useTouchCapability";

interface ItemNodeProps {
    item: RoomItem;
    catalogItem?: Doc<"catalogItems">;
    isSelected: boolean;
    mode: "view" | "edit";
    scale: number;
    onSelect: () => void;
    onChange: (item: RoomItem) => void;
    onDragStart?: () => void;
    onDragEnd?: () => void;
    onComputerClick?: () => void;
    onMusicPlayerClick?: () => void;
    onGameClick?: () => void;
    isOnboardingComputerTarget?: boolean;
    isVisitor?: boolean;
    overlay?: React.ReactNode;
    onBringToFront?: () => void;
    onSendToBack?: () => void;
    canBringToFront?: boolean;
    canSendToBack?: boolean;
}

export function ItemNode({
    item,
    catalogItem,
    isSelected,
    mode,
    scale,
    onSelect,
    onChange,
    onDragStart,
    onDragEnd,
    onComputerClick,
    onMusicPlayerClick,
    onGameClick,
    isOnboardingComputerTarget: _isOnboardingComputerTarget,
    isVisitor = false,
    overlay,
    onBringToFront,
    onSendToBack,
    canBringToFront = true,
    canSendToBack = true,
}: ItemNodeProps) {
    const [isDragging, setIsDragging] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const itemStart = useRef({ x: 0, y: 0 });
    const pointerIdRef = useRef<number | null>(null);
    const itemRef = useRef(item);
    const scaleRef = useRef(scale);
    const onChangeRef = useRef(onChange);
    const onDragEndRef = useRef(onDragEnd);
    const isTouchOnly = useTouchOnly();
    const imageUrl = catalogItem?.assetUrl ?? "";
    const resolvedWidth = catalogItem?.defaultWidth ?? 150;
    const shouldPreventDefaultClick = useRef(false);

    useEffect(() => {
        itemRef.current = item;
    }, [item]);

    useEffect(() => {
        scaleRef.current = scale;
    }, [scale]);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    useEffect(() => {
        onDragEndRef.current = onDragEnd;
    }, [onDragEnd]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (mode !== "edit") return;
        if (isTouchOnly) return;
        e.stopPropagation();
        e.preventDefault();

        onSelect();
        setIsDragging(true);
        onDragStart?.();

        dragStart.current = { x: e.clientX, y: e.clientY };
        itemStart.current = { x: item.x, y: item.y };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (mode !== "edit") return;
        if (e.pointerType !== "touch") return;
        e.stopPropagation();
        e.preventDefault();
        shouldPreventDefaultClick.current = true;

        if (e.currentTarget.setPointerCapture) {
            e.currentTarget.setPointerCapture(e.pointerId);
        }

        onSelect();
        setIsDragging(true);
        onDragStart?.();

        pointerIdRef.current = e.pointerId;
        dragStart.current = { x: e.clientX, y: e.clientY };
        itemStart.current = { x: item.x, y: item.y };
    };

    useEffect(() => {
        if (!isDragging) return;

        const updatePosition = (clientX: number, clientY: number) => {
            const dx = clientX - dragStart.current.x;
            const dy = clientY - dragStart.current.y;

            const nextItem = {
                ...itemRef.current,
                x: itemStart.current.x + dx / scaleRef.current,
                y: itemStart.current.y + dy / scaleRef.current,
            };

            onChangeRef.current(nextItem);
        };

        const handleMouseMove = (e: MouseEvent) => {
            updatePosition(e.clientX, e.clientY);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            onDragEndRef.current?.();
        };

        const handlePointerMove = (e: PointerEvent) => {
            if (e.pointerType !== "touch") return;
            if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
            updatePosition(e.clientX, e.clientY);
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (e.pointerType !== "touch") return;
            if (pointerIdRef.current !== null && e.pointerId !== pointerIdRef.current) return;
            pointerIdRef.current = null;
            shouldPreventDefaultClick.current = false;
            if (e.target instanceof Element && "releasePointerCapture" in e.target) {
                (e.target as Element).releasePointerCapture(e.pointerId);
            }
            setIsDragging(false);
            onDragEndRef.current?.();
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);
        window.addEventListener("pointercancel", handlePointerUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
            window.removeEventListener("pointercancel", handlePointerUp);
        };
    }, [isDragging]);

    const category = catalogItem?.category?.toLowerCase();
    const isComputerCategory = category === "computers";
    const isMusicCategory = category === "music";
    const isGameCategory = category === "games";
    const hasUrl = Boolean(item.url);
    const isInteractable =
        mode === "view" &&
        (isVisitor
            ? Boolean(
                hasUrl ||
                (isComputerCategory && onComputerClick) ||
                (isMusicCategory && onMusicPlayerClick) ||
                (isGameCategory && onGameClick)
            )
            : Boolean(
                (isComputerCategory && onComputerClick) ||
                (isMusicCategory && onMusicPlayerClick) ||
                (isGameCategory && onGameClick) ||
                hasUrl
            ));

    const cursor =
        mode === "edit"
            ? "var(--cozy-cursor-drag)"
            : isInteractable
                ? "var(--cozy-cursor-click)"
                : "var(--cozy-cursor-default)";

    return (
        <div
            className="absolute select-none"
            data-cozy-clickable={isInteractable ? "true" : undefined}
            style={{
                left: item.x,
                top: item.y,
                transform: "translate(-50%, -50%)",
                zIndex: 10,
                cursor,
                touchAction: mode === "edit" ? "none" : "manipulation",
            }}
            onMouseDown={handleMouseDown}
            onPointerDown={handlePointerDown}
            onClick={(e) => {
                e.stopPropagation();
                if (shouldPreventDefaultClick.current) {
                    shouldPreventDefaultClick.current = false;
                    return;
                }
                if (mode !== "view" || !isInteractable) return;

                if (isMusicCategory && onMusicPlayerClick) {
                    onMusicPlayerClick();
                    return;
                }

                if (isGameCategory && onGameClick) {
                    onGameClick();
                    return;
                }

                if (isVisitor && item.url) {
                    window.open(item.url, "_blank");
                    return;
                }

                if (isComputerCategory && onComputerClick) {
                    onComputerClick();
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
                                filter: isSelected && mode === "edit" ? "drop-shadow(0 0 4px var(--chart-4))" : "none",
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
                        <div className="absolute inset-0 pointer-events-none rounded-md outline outline-2 outline-dotted outline-[var(--color-foreground)]/80 outline-offset-4" />
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-2 pointer-events-auto z-20">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onBringToFront?.();
                                }}
                                disabled={!canBringToFront}
                                className="bg-white border-2 border-[var(--ink)] rounded-full p-1.5 shadow-md hover:bg-[var(--muted)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Bring to front"
                                aria-label="Bring to front"
                            >
                                <ArrowUp className="w-4 h-4 text-[var(--ink)]" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onChange({ ...item, flipped: !item.flipped });
                                }}
                                className="bg-white border-2 border-[var(--ink)] rounded-full p-1.5 shadow-md hover:bg-[var(--muted)] transition-colors"
                                title="Flip horizontally"
                                aria-label="Flip horizontally"
                            >
                                <FlipHorizontal2 className="w-4 h-4 text-[var(--ink)]" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onSendToBack?.();
                                }}
                                disabled={!canSendToBack}
                                className="bg-white border-2 border-[var(--ink)] rounded-full p-1.5 shadow-md hover:bg-[var(--muted)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Send to back"
                                aria-label="Send to back"
                            >
                                <ArrowDown className="w-4 h-4 text-[var(--ink)]" />
                            </button>
                        </div>
                    </>
                )}

                {overlay}
            </div>
        </div>
    );
}
