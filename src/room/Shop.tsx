import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { X, Coins, ShoppingBag, Home, Package } from "lucide-react";
import { useState } from "react";
import { ItemsTab } from "./shop/ItemsTab";
import { RoomsTab } from "./shop/RoomsTab";

type ShopTab = "items" | "rooms";

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
    const [activeTab, setActiveTab] = useState<ShopTab>("items");
    const catalogItems = useQuery(api.catalog.list);
    const ownedItemIds = useQuery(api.inventory.getMyInventoryIds);
    const purchaseItem = useMutation(api.inventory.purchaseItem);
    const [purchasing, setPurchasing] = useState<Id<"catalogItems"> | null>(null);
    const [lastResult, setLastResult] = useState<{ itemId: Id<"catalogItems">; message: string; success: boolean } | null>(null);
    const roomTemplates = useQuery(api.roomTemplates.list);
    const ownedTemplateIds = useQuery(api.roomTemplates.listOwnedTemplateIds);
    const purchaseRoom = useMutation(api.roomTemplates.purchaseRoom);
    const [purchasingRoom, setPurchasingRoom] = useState<Id<"roomTemplates"> | null>(null);
    const [lastRoomResult, setLastRoomResult] = useState<{ templateId: Id<"roomTemplates">; message: string; success: boolean } | null>(null);

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

    const handlePurchaseRoom = async (templateId: Id<"roomTemplates">) => {
        setPurchasingRoom(templateId);
        setLastRoomResult(null);
        try {
            const result = await purchaseRoom({ templateId });
            setLastRoomResult({ 
                templateId, 
                message: result.message || "Room purchased! Switch to it from My Rooms.", 
                success: result.success 
            });
        } catch {
            setLastRoomResult({ templateId, message: "Purchase failed", success: false });
        } finally {
            setPurchasingRoom(null);
        }
    };

    const ownedSet = new Set(ownedItemIds || []);
    const ownedTemplateSet = new Set(ownedTemplateIds || []);
    const groupedItems = catalogItems ? groupByCategory(catalogItems) : {};
    const categories = Object.keys(groupedItems).sort();
    const purchasableRooms = roomTemplates?.filter(t => !t.isDefault) || [];

    const isLoading = !catalogItems || !roomTemplates;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center font-['Patrick_Hand']"
            onClick={onClose}
        >
            {/* Shop Window */}
            <div
                className="relative bg-[var(--paper)] rounded-2xl shadow-lg w-[90vw] max-w-3xl max-h-[80vh] border-2 border-[var(--ink)] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-[var(--paper-header)] border-b-2 border-[var(--ink)] text-[var(--ink)] p-4 flex items-center justify-between shadow-sm shrink-0">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="h-7 w-7" />
                        <h2 className="text-2xl font-bold tracking-wide">Shop</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* Currency Display */}
                        <div className="flex items-center gap-2 bg-[var(--warning-light)] rounded-full px-4 py-1.5 border-2 border-[var(--ink)] shadow-sm">
                            <Coins className="h-5 w-5 text-[var(--warning)]" />
                            <span className="font-bold text-lg text-[var(--ink)]">{userCurrency}</span>
                        </div>
                        <button
                            onClick={onClose}
                            className="bg-white hover:bg-[var(--muted)] rounded-full p-1.5 transition-colors border-2 border-[var(--ink)] shadow-sm"
                        >
                            <X className="h-5 w-5 text-[var(--ink)]" />
                        </button>
                    </div>
                </div>

                {/* Tab Navigation */}
                <div className="bg-[var(--paper-header)] border-b-2 border-[var(--ink)] px-4 pt-2 shrink-0">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab("items")}
                            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-bold text-lg transition-all border-2 ${
                                activeTab === "items"
                                    ? "bg-[var(--paper)] text-[var(--ink)] border-b-0 border-[var(--ink)] -mb-[2px] z-10 shadow-sm"
                                    : "bg-transparent text-[var(--ink-subtle)] hover:text-[var(--ink)] border-transparent"
                            }`}
                        >
                            <Package className="h-5 w-5" />
                            Items
                            {catalogItems && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border-2 ${
                                    activeTab === "items" 
                                        ? "bg-[var(--warning)] text-white border-[var(--ink)]" 
                                        : "bg-[var(--muted)] text-[var(--ink-muted)] border-[var(--ink)]"
                                }`}>
                                    {catalogItems.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("rooms")}
                            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-t-xl font-bold text-lg transition-all border-2 ${
                                activeTab === "rooms"
                                    ? "bg-[var(--paper)] text-[var(--ink)] border-b-0 border-[var(--ink)] -mb-[2px] z-10 shadow-sm"
                                    : "bg-transparent text-[var(--ink-subtle)] hover:text-[var(--ink)] border-transparent"
                            }`}
                        >
                            <Home className="h-5 w-5" />
                            Rooms
                            {purchasableRooms.length > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full border-2 ${
                                    activeTab === "rooms" 
                                        ? "bg-[var(--danger)] text-white border-[var(--ink)]" 
                                        : "bg-[var(--muted)] text-[var(--ink-muted)] border-[var(--ink)]"
                                }`}>
                                    {purchasableRooms.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Shop Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {isLoading ? (
                        <div className="text-center py-12 text-[var(--ink-subtle)]">
                            <div className="animate-pulse text-xl">Loading shop...</div>
                        </div>
                    ) : activeTab === "items" ? (
                        <ItemsTab
                            groupedItems={groupedItems}
                            categories={categories}
                            ownedSet={ownedSet}
                            userCurrency={userCurrency}
                            purchasing={purchasing}
                            lastResult={lastResult}
                            isOnboardingBuyStep={isOnboardingBuyStep}
                            onPurchase={handlePurchase}
                            getCategoryDisplayName={getCategoryDisplayName}
                            getCategoryColor={getCategoryColor}
                        />
                    ) : (
                        <RoomsTab
                            purchasableRooms={purchasableRooms}
                            ownedTemplateSet={ownedTemplateSet}
                            userCurrency={userCurrency}
                            purchasingRoom={purchasingRoom}
                            lastRoomResult={lastRoomResult}
                            onPurchaseRoom={handlePurchaseRoom}
                        />
                    )}
                </div>

                {/* Footer hint */}
                <div className="bg-[var(--paper-header)] border-t-2 border-[var(--ink)] px-4 py-2 text-center text-sm text-[var(--ink-subtle)] shrink-0">
                    Earn tokens daily by visiting your cozytab!
                </div>
            </div>
        </div>
    );
}
