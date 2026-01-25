import { Card } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { AssetImage } from "@/components/AssetImage";
import { ItemCountBadge } from "@/room/components/ItemCountBadge";
import { cardClass, compactCardClass, iconButtonClass } from "../constants";
import { setDragImageFromElement } from "@/room/utils/dragPreview";
import type { ItemCardProps } from "../types";

export function ItemCard({
    item,
    highlightComputer,
    isGuest,
    isPending,
    showHideControls,
    onDragStart,
    onToggleHidden,
    compact = false,
}: ItemCardProps) {
    const isComputer = item.category === "computers";
    const highlightClass =
        highlightComputer && isComputer
            ? "outline outline-2 outline-dotted outline-[var(--color-accent)] outline-offset-4"
            : "";
    const shouldShowToggle = !isGuest && showHideControls;
    const isDepleted = (item.remaining ?? 0) <= 0;
    const imageWrapperClass = compact
        ? "relative aspect-[4/3] overflow-hidden rounded-lg border-2 border-dashed border-[var(--color-foreground)]/30 bg-[var(--color-muted)]/15"
        : "relative aspect-square overflow-hidden rounded-xl border-2 border-dashed border-[var(--color-foreground)]/40 bg-[var(--color-muted)]/20";
    const toggleVisibilityClass = isPending ? "opacity-60" : "opacity-0 group-hover:opacity-100 focus-visible:opacity-100";
    const togglePositionClass = compact ? "right-1.5 top-1.5 h-8 w-8 shadow-[var(--shadow-3)]" : "";
    const titleClass = compact
        ? "line-clamp-2 text-size-sm font-black uppercase tracking-normal text-[var(--color-foreground)] leading-snug"
        : "line-clamp-2 text-size-lg font-black uppercase tracking-normal text-[var(--color-foreground)] leading-tight";
    const titleRowClass = compact ? "flex items-start justify-between gap-1.5" : "flex items-start justify-between gap-2";

    return (
        <Card
            key={item.inventoryId}
            data-onboarding={isComputer ? "storage-item-computer" : undefined}
            className={`relative ${compact ? compactCardClass : cardClass} ${highlightClass} ${
                isDepleted ? "opacity-60 cursor-not-allowed" : "cursor-grab active:cursor-grabbing"
            }`}
            draggable={!isDepleted}
            onDragStart={(e) => {
                if (isDepleted) {
                    e.preventDefault();
                    return;
                }
                e.dataTransfer.effectAllowed = "move";
                const img = e.currentTarget.querySelector("img") as HTMLImageElement | null;
                setDragImageFromElement(e, img);
                onDragStart(e, item.catalogItemId);
            }}
            tabIndex={0}
            role="button"
            aria-label={`${item.name} item`}
        >
            <div className={imageWrapperClass}>
                <AssetImage assetUrl={item.assetUrl} alt={item.name} className="h-full w-full object-contain" draggable={false} />
                {shouldShowToggle && (
                    <button
                        type="button"
                        className={`${iconButtonClass} ${toggleVisibilityClass} ${togglePositionClass}`}
                        onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            onToggleHidden(item.inventoryId, !item.hidden);
                        }}
                        disabled={isPending}
                        aria-label={item.hidden ? "Unhide item" : "Hide item"}
                        title={item.hidden ? "Unhide" : "Hide"}
                    >
                        {item.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                )}
            </div>
            <ItemCountBadge count={Math.max(0, item.remaining ?? 0)} muted={isDepleted} />
            <div className={titleRowClass}>
                <div className={titleClass} title={item.name}>
                    {item.name}
                </div>
                {item.hidden && (
                    <span className="rounded-full border border-[var(--color-foreground)] bg-[var(--color-muted)] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest text-[var(--color-foreground)]">
                        Hidden
                    </span>
                )}
            </div>
        </Card>
    );
}
