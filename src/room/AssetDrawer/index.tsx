import { useCallback, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMutation, useQuery } from "convex/react";
import { Package } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { FilterPills } from "./components/FilterPills";
import { HiddenItemsSection } from "./components/HiddenItemsSection";
import { EmptyState } from "./components/EmptyState";
import { LoadingState } from "./components/LoadingState";
import { ItemCard } from "./components/ItemCard";
import { ASSET_DRAWER_WIDTH, HIDE_TOGGLE_THRESHOLD, handwritingFont } from "./constants";
import type { AssetDrawerProps, GuestDrawerItem } from "./types";

export function AssetDrawer({ isOpen, onDragStart, highlightComputer, isGuest = false, guestItems }: AssetDrawerProps) {
    const inventoryItems = useQuery(api.inventory.getMyInventory, isGuest ? "skip" : undefined);
    const setHiddenMutation = useMutation(api.inventory.setHidden);
    const isLoading = isGuest ? guestItems === undefined : inventoryItems === undefined;
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({ hidden: true });
    const [pendingHides, setPendingHides] = useState<Record<string, boolean>>({});
    const [isBulkUnhiding, setIsBulkUnhiding] = useState(false);

    const items: GuestDrawerItem[] = useMemo(() => (isGuest ? guestItems : inventoryItems) ?? [], [guestItems, inventoryItems, isGuest]);
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

    return (
        <div
            style={{ width: ASSET_DRAWER_WIDTH }}
            className={`absolute right-0 top-0 bottom-0 z-40 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? "translate-x-0" : "translate-x-full"}`}
        >
            <div
                className="relative flex h-full flex-col overflow-hidden rounded-l-3xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[-6px_0_0_0_var(--color-foreground)]"
                style={handwritingFont}
            >
                <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] px-5 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] shadow-[2px_2px_0px_0px_var(--color-foreground)]">
                            <Package className="h-6 w-6 text-[var(--color-foreground)]" />
                        </div>
                        <div>
                            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[var(--color-foreground)]">Inventory</p>
                            <h2 className="text-xl font-bold leading-none text-[var(--color-foreground)]">Storage</h2>
                        </div>
                    </div>
                    <span className="hidden sm:inline-flex items-center rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-[2px_2px_0px_0px_var(--color-foreground)]">
                        Drag to place
                    </span>
                </div>

                <div className="border-b-2 border-[var(--color-foreground)] bg-[var(--color-card)] px-4 py-3">
                    <FilterPills categories={categories} selectedFilter={selectedFilter} onChange={setSelectedFilter} />
                </div>

                <ScrollArea className="flex-1 bg-[var(--color-background)]">
                    <div className="space-y-6 p-4 pb-6">
                        {isLoading ? (
                            <LoadingState />
                        ) : items.length > 0 ? (
                            <>
                                {visibleItems.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
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
                            <EmptyState />
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
