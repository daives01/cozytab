import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { X, Coins, Check, ShoppingBag } from "lucide-react";
import { useState } from "react";

interface ShopProps {
    onClose: () => void;
    userCurrency: number;
    isOnboardingBuyStep?: boolean;
    onOnboardingPurchase?: () => void;
}

function groupByCategory(items: Doc<"catalogItems">[]) {
    const groups: Record<string, Doc<"catalogItems">[]> = {};
    for (const item of items) {
        if (!groups[item.category]) {
            groups[item.category] = [];
        }
        groups[item.category].push(item);
    }
    return groups;
}

function getCategoryDisplayName(category: string): string {
    const names: Record<string, string> = {
        furniture: "Furniture",
        decor: "Decorations",
        computer: "Electronics",
        player: "Music & Media",
    };
    return names[category] || category.charAt(0).toUpperCase() + category.slice(1);
}

function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
        furniture: "from-amber-500 to-orange-600",
        decor: "from-emerald-500 to-teal-600",
        computer: "from-blue-500 to-indigo-600",
        player: "from-purple-500 to-pink-600",
    };
    return colors[category] || "from-gray-500 to-gray-600";
}

export function Shop({ onClose, userCurrency, isOnboardingBuyStep, onOnboardingPurchase }: ShopProps) {
    const catalogItems = useQuery(api.catalog.list);
    const ownedItemIds = useQuery(api.inventory.getMyInventoryIds);
    const purchaseItem = useMutation(api.inventory.purchaseItem);
    const [purchasing, setPurchasing] = useState<Id<"catalogItems"> | null>(null);
    const [lastResult, setLastResult] = useState<{ itemId: Id<"catalogItems">; message: string; success: boolean } | null>(null);

    const handlePurchase = async (itemId: Id<"catalogItems">) => {
        setPurchasing(itemId);
        setLastResult(null);
        try {
            const result = await purchaseItem({ catalogItemId: itemId });
            setLastResult({ itemId, message: result.message || "Purchase successful!", success: result.success });
            if (result.success && onOnboardingPurchase) {
                onOnboardingPurchase();
            }
        } catch {
            setLastResult({ itemId, message: "Purchase failed", success: false });
        } finally {
            setPurchasing(null);
        }
    };

    const ownedSet = new Set(ownedItemIds || []);
    const groupedItems = catalogItems ? groupByCategory(catalogItems) : {};
    const categories = Object.keys(groupedItems).sort();

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center font-['Patrick_Hand']"
            onClick={onClose}
        >
            {/* Shop Window */}
            <div
                className="relative bg-[#f5e6d3] rounded-2xl shadow-2xl w-[90vw] max-w-3xl max-h-[80vh] border-4 border-[#d4c3aa] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-600 to-orange-500 text-white p-4 flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="h-7 w-7" />
                        <h2 className="text-2xl font-bold tracking-wide">Item Shop</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Currency Display */}
                        <div className="flex items-center gap-2 bg-white/20 rounded-full px-4 py-1.5 border border-white/30">
                            <Coins className="h-5 w-5 text-yellow-300" />
                            <span className="font-bold text-lg">{userCurrency}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-white/20 hover:bg-white/30 rounded-full p-1.5 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Shop Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
                    {!catalogItems ? (
                        <div className="text-center py-12 text-[#8b7355]">
                            <div className="animate-pulse text-xl">Loading shop...</div>
                        </div>
                    ) : categories.length === 0 ? (
                        <div className="text-center py-12 text-[#8b7355]">
                            <ShoppingBag className="h-16 w-16 mx-auto mb-4 opacity-50" />
                            <p className="text-xl">Shop is empty!</p>
                            <p className="text-sm mt-2">Check back later for new items.</p>
                        </div>
                    ) : (
                        <div className="space-y-8">
                            {categories.map((category) => (
                                <div key={category}>
                                    {/* Category Header */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className={`h-1 flex-1 rounded-full bg-gradient-to-r ${getCategoryColor(category)} opacity-50`} />
                                        <h3 className="text-xl font-bold text-[#5c4d3c] uppercase tracking-wider">
                                            {getCategoryDisplayName(category)}
                                        </h3>
                                        <div className={`h-1 flex-1 rounded-full bg-gradient-to-l ${getCategoryColor(category)} opacity-50`} />
                                    </div>

                                    {/* Items Grid */}
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
                                                    {/* Owned Badge */}
                                                    {isOwned && (
                                                        <div className="absolute -top-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                                                            <Check className="h-4 w-4" />
                                                        </div>
                                                    )}

                                                    {/* Item Image */}
                                                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                                        <img
                                                            src={item.assetUrl}
                                                            alt={item.name}
                                                            className="object-contain w-full h-full"
                                                            draggable={false}
                                                        />
                                                    </div>

                                                    {/* Item Name */}
                                                    <h4 className="font-bold text-[#5c4d3c] text-center truncate mb-2">
                                                        {item.name}
                                                    </h4>

                                                    {/* Price / Buy Button */}
                                                    {isOwned ? (
                                                        <div className="text-center text-emerald-600 font-bold text-sm">
                                                            Owned
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handlePurchase(item._id)}
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

                                                    {/* Purchase Result Message */}
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
                    )}
                </div>

                {/* Footer hint */}
                <div className="bg-[#e6d5c3] border-t-2 border-[#d4c3aa] px-4 py-2 text-center text-sm text-[#8b7355]">
                    Earn tokens daily by visiting your cozytab!
                </div>
            </div>
        </div>
    );
}

