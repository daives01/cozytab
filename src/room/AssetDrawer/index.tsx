import { useCallback, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { AssetDrawerHeader } from "./components/Header";
import { HiddenItemsSection } from "./components/HiddenItemsSection";
import { ItemCard } from "./components/ItemCard";
import { ASSET_DRAWER_WIDTH, ASSET_DRAWER_BOTTOM_HEIGHT, HIDE_TOGGLE_THRESHOLD, handwritingFont } from "./constants";
import type { AssetDrawerProps, GuestDrawerItem } from "./types";
import { countIds } from "../utils/itemCounts";
import { Package } from "lucide-react";

export function AssetDrawer({
    isOpen,
    onDragStart,
    highlightComputer,
    isGuest = false,
    guestItems,
    placedCatalogItemIds = [],
    orientation = "left",
}: AssetDrawerProps) {
    const inventoryItems = useQuery(api.inventory.getMyInventory, isGuest ? "skip" : undefined);
    const setHiddenMutation = useMutation(api.inventory.setHidden);
    const isLoading = isGuest ? guestItems === undefined : inventoryItems === undefined;
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({ hidden: true });
    const [pendingHides, setPendingHides] = useState<Record<string, boolean>>({});
    const [isBulkUnhiding, setIsBulkUnhiding] = useState(false);

    const placedCounts = useMemo(() => countIds(placedCatalogItemIds), [placedCatalogItemIds]);

    const items: GuestDrawerItem[] = useMemo(() => {
        const source = ((isGuest ? guestItems : inventoryItems) ?? []) as Array<Partial<GuestDrawerItem>>;
        return source.map((item) => {
            const total = Math.max(1, item.count ?? 1);
            const placed = placedCounts.get(String(item.catalogItemId)) ?? 0;
            return {
                ...item,
                count: total,
                remaining: Math.max(0, total - placed),
            } as GuestDrawerItem;
        });
    }, [guestItems, inventoryItems, isGuest, placedCounts]);
    const [selectedFilter, setSelectedFilter] = useState<string>("all");
    const showHideControls = !isGuest && items.length > HIDE_TOGGLE_THRESHOLD;

    const toggleSection = useCallback((key: string) => {
        setCollapsedSections((prev) => ({ ...prev, [key]: !prev[key] }));
    }, []);

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

    const categories = useMemo(() => Array.from(new Set(items.map((i) => i.category))).sort((a, b) => a.localeCompare(b)), [items]);

    const matchesFilter = useCallback((category: string) => selectedFilter === "all" || category === selectedFilter, [selectedFilter]);

    const visibleItems = useMemo(
        () => items.filter((item) => !item.hidden && matchesFilter(item.category)).sort((a, b) => a.name.localeCompare(b.name)),
        [items, matchesFilter]
    );

    const hiddenItems = useMemo(
        () => items.filter((item) => item.hidden && matchesFilter(item.category)).sort((a, b) => a.name.localeCompare(b.name)),
        [items, matchesFilter]
    );

    const handleUnhideAll = useCallback(async () => {
        if (isGuest || hiddenItems.length === 0) return;
        setIsBulkUnhiding(true);
        try {
            await Promise.all(hiddenItems.map((item) => setHiddenMutation({ inventoryId: item.inventoryId as Id<"inventory">, hidden: false })));
        } finally {
            setIsBulkUnhiding(false);
        }
    }, [hiddenItems, isGuest, setHiddenMutation]);

    const isLeft = orientation === "left";
    const drawerSizeStyle = isLeft
        ? { width: ASSET_DRAWER_WIDTH, height: "100%" }
        : { width: "100%", height: ASSET_DRAWER_BOTTOM_HEIGHT };
    const translateClass = isLeft
        ? isOpen
            ? "translate-x-0"
            : "-translate-x-full"
        : isOpen
            ? "translate-y-0"
            : "translate-y-full";
    const positionClass = isLeft ? "left-0 top-0 bottom-0" : "left-0 right-0 bottom-0";
    const containerRadii = isLeft ? "rounded-r-3xl" : "rounded-t-3xl";
    const shadowClass = isLeft ? "shadow-[var(--shadow-6)]" : "shadow-[var(--shadow-6-soft)]";
    const isBottom = orientation === "bottom";
    const gridClass = isBottom
        ? "grid grid-cols-[repeat(auto-fit,minmax(130px,160px))] auto-rows-min justify-center gap-3"
        : "grid grid-cols-2 gap-3";

    return (
        <div
            data-asset-drawer="true"
            style={drawerSizeStyle}
            className={`absolute ${positionClass} z-40 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${translateClass}`}
        >
            <div
                className={`relative flex h-full flex-col overflow-hidden border-2 border-[var(--color-foreground)] bg-[var(--color-background)] ${containerRadii} ${shadowClass}`}
                style={handwritingFont}
            >
                <AssetDrawerHeader
                    isCompact={isBottom}
                    categories={categories}
                    selectedFilter={selectedFilter}
                    onFilterChange={setSelectedFilter}
                />

                <ScrollArea className="flex-1 bg-[var(--color-background)] min-h-0">
                    <div className="space-y-6 p-4 pb-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-foreground)]/30 bg-[var(--color-card)] px-4 py-6 text-center shadow-[var(--shadow-4)]">
                                <div className="h-12 w-12 animate-spin rounded-full border-2 border-dashed border-[var(--color-foreground)]/30" />
                                <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Loading storage…</p>
                            </div>
                        ) : items.length > 0 ? (
                            <>
                                {visibleItems.length > 0 ? (
                                    <div className={gridClass}>
                                        {visibleItems.map((item) => (
                                            <ItemCard
                                                key={item.inventoryId}
                                                item={item}
                                                highlightComputer={highlightComputer}
                                                isGuest={isGuest}
                                                isPending={pendingHides[String(item.inventoryId)]}
                                                showHideControls={showHideControls}
                                                onDragStart={onDragStart}
                                                onToggleHidden={handleToggleHidden}
                                                compact={isBottom}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-foreground)]/40 bg-[var(--color-muted)]/10 px-4 py-6 text-center">
                                        <p className="text-sm font-black uppercase tracking-[0.18em] text-[var(--color-foreground)]">No items match this filter</p>
                                        <p className="mt-1 text-xs font-medium text-[var(--color-muted-foreground)]">Try another category or unhide items below.</p>
                                    </div>
                                )}

                                {!isGuest && hiddenItems.length > 0 && (
                                    <HiddenItemsSection
                                        items={hiddenItems}
                                        collapsed={collapsedSections.hidden ?? true}
                                        onToggleSection={() => toggleSection("hidden")}
                                        onUnhideAll={handleUnhideAll}
                                        onDragStart={onDragStart}
                                        onToggleHidden={handleToggleHidden}
                                        pendingHides={pendingHides}
                                        isBulkUnhiding={isBulkUnhiding}
                                        isGuest={isGuest}
                                        showHideControls={showHideControls}
                                        highlightComputer={highlightComputer}
                                    />
                                )}
                            </>
                        ) : (
                            <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-[var(--color-foreground)] bg-[var(--color-card)] px-6 py-8 text-center shadow-[var(--shadow-8)]">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] text-[var(--color-foreground)] shadow-[var(--shadow-4)]">
                                    <Package className="h-7 w-7" />
                                </div>
                                <p className="text-lg font-black uppercase tracking-[0.22em] text-[var(--color-foreground)]">Storage is empty</p>
                                <p className="max-w-[220px] text-sm font-medium text-[var(--color-muted-foreground)]">Visit the shop on your computer to start decorating your room.</p>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
