import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AssetImage } from "../components/AssetImage";
import { ChevronDown, Eye, EyeOff, Package } from "lucide-react";

type GuestDrawerItem = {
    inventoryId: Id<"inventory"> | string;
    catalogItemId: string;
    name: string;
    assetUrl: string;
    category: string;
    hidden?: boolean;
};

interface AssetDrawerProps {
    isOpen: boolean;
    onDragStart: (e: React.DragEvent, id: string) => void;
    highlightComputer?: boolean;
    isGuest?: boolean;
    guestItems?: GuestDrawerItem[] | undefined;
}

export const ASSET_DRAWER_WIDTH = 260;

const SectionHeader = ({
    title,
    count,
    collapsed,
    onToggle,
}: {
    title: string;
    count: number;
    collapsed: boolean;
    onToggle: () => void;
}) => (
    <button
        type="button"
        onClick={onToggle}
        className="sticky top-0 z-10 flex w-full items-center justify-between rounded-md border-2 border-[var(--ink)] bg-[var(--paper-header)] px-3 py-2 text-left shadow-sm transition-colors hover:bg-[var(--paper)]"
    >
        <span className="font-['Patrick_Hand'] text-sm font-bold uppercase tracking-widest text-[var(--ink)]">
            {title}
        </span>
        <span className="flex items-center gap-2 text-[var(--ink-muted)]">
            <span className="rounded-full bg-[var(--paper)] px-2 py-0.5 text-xs font-semibold border border-[var(--ink)]/20">
                {count}
            </span>
            <ChevronDown
                className={`h-4 w-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
            />
        </span>
    </button>
);

export function AssetDrawer({ isOpen, onDragStart, highlightComputer, isGuest = false, guestItems }: AssetDrawerProps) {
    const inventoryItems = useQuery(api.inventory.getMyInventory, isGuest ? "skip" : undefined);
    const setHiddenMutation = useMutation(api.inventory.setHidden);
    const isLoading = isGuest ? guestItems === undefined : inventoryItems === undefined;
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        hidden: true,
    });
    const [pendingHides, setPendingHides] = useState<Record<string, boolean>>({});
    const [isBulkUnhiding, setIsBulkUnhiding] = useState(false);

    const items: GuestDrawerItem[] = useMemo(
        () => (isGuest ? guestItems : inventoryItems) ?? [],
        [guestItems, inventoryItems, isGuest]
    );
    const [selectedFilter, setSelectedFilter] = useState<string>("all");

    const toggleSection = (key: string) => {
        setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleToggleHidden = useCallback(
        async (inventoryId: Id<"inventory"> | string, nextHidden: boolean) => {
            if (isGuest) return;
            const key = String(inventoryId);
            setPendingHides((prev) => ({ ...prev, [key]: true }));
            try {
                await setHiddenMutation({ inventoryId: inventoryId as Id<"inventory">, hidden: nextHidden });
            } finally {
                setPendingHides((prev) => {
                    const updated = { ...prev };
                    delete updated[key];
                    return updated;
                });
            }
        },
        [isGuest, setHiddenMutation]
    );

    const categories = useMemo(
        () => Array.from(new Set(items.map((i) => i.category))).sort((a, b) => a.localeCompare(b)),
        [items]
    );

    const matchesFilter = useCallback(
        (category: string) => selectedFilter === "all" || category === selectedFilter,
        [selectedFilter]
    );

    const visibleItems = useMemo(
        () =>
            items
                .filter((item) => !item.hidden && matchesFilter(item.category))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [items, matchesFilter]
    );

    const hiddenItems = useMemo(
        () =>
            items
                .filter((item) => item.hidden && matchesFilter(item.category))
                .sort((a, b) => a.name.localeCompare(b.name)),
        [items, matchesFilter]
    );

    const handleUnhideAll = useCallback(async () => {
        if (isGuest || hiddenItems.length === 0) return;
        setIsBulkUnhiding(true);
        try {
            await Promise.all(
                hiddenItems.map((item) =>
                    setHiddenMutation({ inventoryId: item.inventoryId as Id<"inventory">, hidden: false })
                )
            );
        } finally {
            setIsBulkUnhiding(false);
        }
    }, [hiddenItems, isGuest, setHiddenMutation]);

    const renderItemCard = (item: (typeof items)[number]) => {
        const categoryKey = item.category.toLowerCase();
        const isComputer = categoryKey.includes("computer");
        const isPending = pendingHides[String(item.inventoryId)];
        const cardPadding = "p-2";

        return (
            <Card
                key={item.inventoryId}
                data-onboarding={isComputer ? "storage-item-computer" : undefined}
                className={`group relative cursor-grab active:cursor-grabbing hover:scale-[1.02] transition-transform border-2 shadow-sm bg-white rotate-1 hover:rotate-0 select-none ${cardPadding} ${
                    highlightComputer && isComputer
                        ? "border-[var(--warning)] ring-2 ring-[var(--warning-light)]"
                        : "border-[var(--ink)]"
                }`}
                draggable
                onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    onDragStart(e, item.catalogItemId);
                }}
                tabIndex={0}
                role="button"
                aria-label={`${item.name} item`}
            >
                <div className="relative aspect-square flex items-center justify-center bg-[var(--muted)] overflow-hidden rounded-sm">
                    <AssetImage
                        assetUrl={item.assetUrl}
                        alt={item.name}
                        className="object-contain w-full h-full"
                        draggable={false}
                    />
                    {!isGuest && (
                        <button
                            type="button"
                            className={`opacity-0 group-hover:opacity-100 absolute right-1.5 top-1.5 inline-flex items-center justify-center rounded-full border-2 bg-white/90 px-2 py-2 text-[var(--ink)] shadow-sm transition-all hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--secondary)] ${
                                item.hidden ? "border-[var(--warning)]/70" : "border-[var(--ink)]/20"
                            } ${isPending ? "opacity-60" : ""}`}
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                handleToggleHidden(item.inventoryId, !item.hidden);
                            }}
                            disabled={isPending}
                            aria-label={item.hidden ? "Unhide item" : "Hide item"}
                            title={item.hidden ? "Unhide" : "Hide"}
                        >
                            {item.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </button>
                    )}
                </div>
                <div className="mt-1 border-t border-dashed border-[var(--ink)]/15 pt-1">
                    <div
                        className="font-['Patrick_Hand'] text-sm font-bold text-[var(--ink)] leading-tight truncate"
                        title={item.name}
                    >
                        {item.name}
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <div
            style={{ width: ASSET_DRAWER_WIDTH }}
            className={`absolute top-0 right-0 bottom-0 bg-[var(--paper-header)] border-2 border-[var(--ink)] rounded-lg z-40 shadow-lg transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex flex-col ${
                isOpen ? "translate-x-0" : "translate-x-full"
            }`}
        >
            {/* Box Flap visual */}
            <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-16 bg-[var(--ink)] rounded-l-md transition-all duration-300 ${
                isOpen ? "-left-3" : "left-0"
            }`} />

            <div className="p-3 border-b-2 border-[var(--ink)] border-dashed space-y-3">
                <div className="flex items-center justify-between gap-2">
                    <h2 className="font-['Patrick_Hand'] text-xl font-bold text-[var(--ink)] uppercase tracking-widest">
                        Storage
                    </h2>
                    <span className="rounded-full border-2 border-[var(--ink)]/30 bg-[var(--paper)] px-3 py-1 text-xs font-semibold text-[var(--ink-muted)] shadow-sm">
                        Drag to place
                    </span>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        size="sm"
                        variant={selectedFilter === "all" ? "secondary" : "ghost"}
                        onClick={() => setSelectedFilter("all")}
                        className="border border-[var(--ink)]/20 text-[var(--ink)]"
                        aria-pressed={selectedFilter === "all"}
                    >
                        All
                    </Button>
                    {categories.map((category) => (
                        <Button
                            key={category}
                            size="sm"
                            variant={selectedFilter === category ? "secondary" : "ghost"}
                            onClick={() => setSelectedFilter(category)}
                            className="border border-[var(--ink)]/20 text-[var(--ink)] capitalize"
                            aria-pressed={selectedFilter === category}
                        >
                            {category}
                        </Button>
                    ))}
                </div>
            </div>
            
            <ScrollArea className="flex-1 min-h-0 bg-[var(--paper)]/50">
                <div className="p-3 space-y-4">
                    {isLoading ? (
                        <div className="p-4 flex flex-col items-center gap-2 text-center">
                            <div className="h-10 w-10 rounded-full border-2 border-dashed border-[var(--ink)]/30 animate-spin" />
                            <p className="font-['Patrick_Hand'] text-sm text-[var(--ink-muted)]">
                                Loading your storage...
                            </p>
                        </div>
                    ) : items.length > 0 ? (
                        <>
                            {visibleItems.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {visibleItems.map((item) => renderItemCard(item))}
                                </div>
                            ) : (
                                <div className="text-center text-xs text-[var(--ink-muted)] py-3">
                                    No items match this filter.
                                </div>
                            )}

                            {!isGuest && (
                                <div className="space-y-2 pt-1">
                                    <SectionHeader
                                        title="Hidden"
                                        count={hiddenItems.length}
                                        collapsed={collapsedSections.hidden ?? true}
                                        onToggle={() => toggleSection("hidden")}
                                    />
                                    {!(collapsedSections.hidden ?? true) && (
                                        <div className="space-y-3">
                                            {hiddenItems.length > 0 ? (
                                                <>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        {hiddenItems.map((item) => renderItemCard(item))}
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={handleUnhideAll}
                                                            disabled={isBulkUnhiding}
                                                            className="w-full text-[var(--ink)]"
                                                        >
                                                            {isBulkUnhiding ? "Unhiding..." : "Unhide all"}
                                                        </Button>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="text-center text-xs text-[var(--ink-muted)] py-3">
                                                    No hidden items yet.
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="p-4 flex flex-col items-center gap-3 text-center">
                            <Package className="h-10 w-10 text-[var(--ink-subtle)] opacity-60" />
                            <p className="font-['Patrick_Hand'] text-sm text-[var(--ink-muted)]">
                                Your storage is empty!
                            </p>
                            <p className="font-['Patrick_Hand'] text-xs text-[var(--ink-subtle)]">
                                Visit the shop on your computer to buy items.
                            </p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    );
}
