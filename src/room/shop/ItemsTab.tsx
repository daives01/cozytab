import { Package, Coins, Check } from "lucide-react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { AssetImage } from "../../components/AssetImage";
import { ItemCountBadge } from "../components/ItemCountBadge";

interface ItemsTabProps {
    groupedItems: Record<string, Doc<"catalogItems">[]>;
    categories: string[];
    ownedCounts: Map<Id<"catalogItems">, number>;
    userCurrency: number;
    purchasing: Id<"catalogItems"> | null;
    lastResult: { itemId: Id<"catalogItems">; message: string; success: boolean } | null;
    onPurchase: (itemId: Id<"catalogItems">) => void;
    getCategoryDisplayName: (category: string) => string;
    getCategoryColor: (category: string) => string;
    highlightItemId?: Id<"catalogItems"> | null;
}

export function ItemsTab({
    groupedItems,
    categories,
    ownedCounts,
    userCurrency,
    purchasing,
    lastResult,
    onPurchase,
    getCategoryDisplayName,
    getCategoryColor,
    highlightItemId = null,
}: ItemsTabProps) {
    if (categories.length === 0) {
        return (
            <div className="text-center py-12 text-[var(--ink-subtle)]">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">No items available!</p>
                <p className="text-sm mt-2">Check back later for new items.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {categories.map((category) => {
                const color = getCategoryColor(category);

                return (
                    <div key={category}>
                        <div className="flex items-center gap-2 mb-3">
                            <div className={`h-1 flex-1 rounded-full bg-gradient-to-r ${color} opacity-50`} />
                            <h3 className="text-lg font-bold text-[var(--ink)] uppercase tracking-wide">
                                {getCategoryDisplayName(category)}
                            </h3>
                            <div className={`h-1 flex-1 rounded-full bg-gradient-to-l ${color} opacity-50`} />
                        </div>

                        <div className="flex flex-wrap gap-2.5 md:gap-3 justify-center md:justify-start">
                            {groupedItems[category].map((item) => {
                                const ownedCount = ownedCounts.get(item._id) ?? 0;
                                const isOwned = ownedCount > 0;
                                const canAfford = userCurrency >= item.basePrice;
                                const isPurchasing = purchasing === item._id;
                                const resultForItem = lastResult?.itemId === item._id ? lastResult : null;
                                const isHighlighted = highlightItemId === item._id;

                                return (
                                    <div
                                        key={item._id}
                                        data-onboarding={isHighlighted ? "first-music-player" : undefined}
                                        className={`relative w-[130px] shrink-0 bg-[var(--paper)] rounded-lg border-2 p-2.5 transition-all shadow-sm ${
                                            isOwned
                                                ? "border-[var(--success)] bg-[var(--success-light)]"
                                                : "border-[var(--ink)] hover:border-[var(--warning)] hover:shadow-md hover:-translate-y-1"
                                        }`}
                                    >
                                        {isHighlighted && (
                                            <div className="absolute -top-3 -left-3 bg-[var(--warning)] text-[var(--ink)] border-2 border-[var(--ink)] rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm">
                                                Start here
                                            </div>
                                        )}
                                        <ItemCountBadge
                                            count={ownedCount}
                                            icon={isOwned ? <Check className="h-4 w-4 text-[var(--success-dark)]" /> : null}
                                            className="border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)]"
                                        />

                                        <div className="w-full h-[112px] bg-transparent rounded-md mb-2 flex items-center justify-center overflow-hidden">
                                            <AssetImage
                                                assetUrl={item.assetUrl}
                                                alt={item.name}
                                                className="object-contain w-full h-full"
                                                draggable={false}
                                            />
                                        </div>

                                        <h4 className="font-bold text-[var(--ink)] text-center truncate mb-1.5 text-size-lg">
                                            {item.name}
                                        </h4>

                                        <button
                                            onClick={() => onPurchase(item._id)}
                                            disabled={!canAfford || isPurchasing}
                                            className={`w-full py-1 px-2.5 rounded-md font-bold text-size-base transition-all flex items-center justify-center gap-1.5 border-2 ${
                                                isPurchasing
                                                    ? "bg-[var(--muted)] text-[var(--ink-subtle)] cursor-wait border-[var(--ink)]"
                                                    : canAfford
                                                    ? "bg-[var(--warning)] text-[var(--ink)] hover:bg-[var(--warning-dark)] border-[var(--ink)] shadow-md active:scale-95 active:shadow-sm active:translate-x-[1px] active:translate-y-[1px]"
                                                    : "bg-[var(--muted)] text-[var(--ink-subtle)] cursor-not-allowed border-[var(--ink)]"
                                            }`}
                                        >
                                            <Coins className="h-3.5 w-3.5" />
                                            <span>{item.basePrice}</span>
                                        </button>

                                        {resultForItem && (
                                            <div
                                                className={`mt-1.5 text-size-sm leading-tight text-center ${
                                                    resultForItem.success ? "text-[var(--success-dark)]" : "text-[var(--danger)]"
                                                }`}
                                            >
                                                {resultForItem.message}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

