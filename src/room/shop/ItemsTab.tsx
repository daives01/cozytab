import { Package, Coins, Check } from "lucide-react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { AssetImage } from "../../components/AssetImage";

interface ItemsTabProps {
    groupedItems: Record<string, Doc<"catalogItems">[]>;
    categories: string[];
    ownedSet: Set<Id<"catalogItems">>;
    userCurrency: number;
    purchasing: Id<"catalogItems"> | null;
    lastResult: { itemId: Id<"catalogItems">; message: string; success: boolean } | null;
    isOnboardingBuyStep?: boolean;
    onPurchase: (itemId: Id<"catalogItems">) => void;
    getCategoryDisplayName: (category: string) => string;
    getCategoryColor: (category: string) => string;
}

export function ItemsTab({
    groupedItems,
    categories,
    ownedSet,
    userCurrency,
    purchasing,
    lastResult,
    isOnboardingBuyStep,
    onPurchase,
    getCategoryDisplayName,
    getCategoryColor,
}: ItemsTabProps) {
    if (categories.length === 0) {
        return (
            <div className="text-center py-12 text-[#8b7355]">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">No items available!</p>
                <p className="text-sm mt-2">Check back later for new items.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {categories.map((category) => (
                <div key={category}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`h-1 flex-1 rounded-full bg-gradient-to-r ${getCategoryColor(category)} opacity-50`} />
                        <h3 className="text-xl font-bold text-[#5c4d3c] uppercase tracking-wider">
                            {getCategoryDisplayName(category)}
                        </h3>
                        <div className={`h-1 flex-1 rounded-full bg-gradient-to-l ${getCategoryColor(category)} opacity-50`} />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                        {groupedItems[category].map((item, itemIndex) => {
                            const isOwned = ownedSet.has(item._id);
                            const canAfford = userCurrency >= item.basePrice;
                            const isPurchasing = purchasing === item._id;
                            const resultForItem = lastResult?.itemId === item._id ? lastResult : null;
                            const isOnboardingTarget = isOnboardingBuyStep && !isOwned && canAfford && itemIndex === 0;

                            return (
                                <div
                                    key={item._id}
                                    data-onboarding={isOnboardingTarget ? "shop-item" : undefined}
                                    className={`relative bg-white rounded-xl border-4 p-3 transition-all ${
                                        isOwned
                                            ? "border-emerald-400 bg-emerald-50"
                                            : isOnboardingTarget
                                            ? "border-amber-400 ring-2 ring-amber-300 shadow-lg"
                                            : "border-[#d4c3aa] hover:border-amber-400 hover:shadow-lg hover:-translate-y-1"
                                    }`}
                                >
                                    {isOwned && (
                                        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                                            <Check className="h-4 w-4" />
                                        </div>
                                    )}

                                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                        <AssetImage
                                            assetUrl={item.assetUrl}
                                            alt={item.name}
                                            className="object-contain w-full h-full"
                                            draggable={false}
                                        />
                                    </div>

                                    <h4 className="font-bold text-[#5c4d3c] text-center truncate mb-2">
                                        {item.name}
                                    </h4>

                                    {isOwned ? (
                                        <div className="text-center text-emerald-600 font-bold text-sm">
                                            Owned
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => onPurchase(item._id)}
                                            disabled={!canAfford || isPurchasing}
                                            className={`w-full py-1.5 px-3 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-1.5 ${
                                                isPurchasing
                                                    ? "bg-gray-300 text-gray-500 cursor-wait"
                                                    : canAfford
                                                    ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600 shadow-md active:scale-95"
                                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                            }`}
                                        >
                                            <Coins className="h-4 w-4" />
                                            <span>{item.basePrice}</span>
                                        </button>
                                    )}

                                    {resultForItem && (
                                        <div
                                            className={`mt-2 text-xs text-center ${
                                                resultForItem.success ? "text-emerald-600" : "text-red-500"
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
            ))}
        </div>
    );
}

