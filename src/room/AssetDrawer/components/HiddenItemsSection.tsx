import { Button } from "@/components/ui/button";
import { SectionHeader } from "./SectionHeader";
import { ItemCard } from "./ItemCard";
import type { HiddenItemsSectionProps } from "../types";

export function HiddenItemsSection({
    items,
    collapsed,
    isBulkUnhiding,
    onToggleSection,
    onUnhideAll,
    onDragStart,
    onTouchPlace,
    onToggleHidden,
    pendingHides,
    isGuest,
    showHideControls,
    highlightComputer,
    touchPlacementItemId,
}: HiddenItemsSectionProps) {
    return (
        <div className="space-y-3">
            <SectionHeader title="Hidden Items" count={items.length} collapsed={collapsed} onToggle={onToggleSection} />
            {!collapsed && (
                <div className="rounded-2xl border-2 border-dashed border-[var(--color-foreground)]/40 bg-[var(--color-muted)]/10 p-3 shadow-[var(--shadow-4)]">
                    {items.length > 0 ? (
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                {items.map((item) => (
                                    <ItemCard
                                        key={item.inventoryId}
                                        item={item}
                                        isTouchSelected={touchPlacementItemId === item.catalogItemId}
                                        highlightComputer={highlightComputer}
                                        isGuest={isGuest}
                                        isPending={pendingHides[String(item.inventoryId)]}
                                        showHideControls={showHideControls}
                                        onDragStart={onDragStart}
                                        onTouchPlace={onTouchPlace}
                                        onToggleHidden={onToggleHidden}
                                    />
                                ))}
                            </div>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={onUnhideAll}
                                disabled={isBulkUnhiding}
                                className="w-full rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)] font-black uppercase tracking-[0.18em] shadow-[var(--shadow-4)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                            >
                                {isBulkUnhiding ? "Unhiding..." : "Unhide all"}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-foreground)]/30 bg-[var(--color-background)] px-4 py-6 text-center">
                            <p className="text-sm font-black uppercase tracking-[0.2em] text-[var(--color-foreground)]">No hidden items</p>
                            <p className="text-xs font-medium text-[var(--color-muted-foreground)]">Hide items to keep your room tidy.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
