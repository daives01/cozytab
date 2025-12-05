import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Coins, Home, Package } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GUEST_STARTING_COINS } from "../../shared/guestTypes";
import { ItemsTab } from "./shop/ItemsTab";
import { RoomsTab } from "./shop/RoomsTab";
import { purchaseWithBudget } from "./utils/sessionGuards";

type ShopTab = "items" | "rooms";

interface ShopProps {
    userCurrency: number;
    lastDailyReward?: number;
    isOnboardingBuyStep?: boolean;
    onOnboardingPurchase?: () => void;
    isGuest?: boolean;
    guestCoins?: number;
    onGuestCoinsChange?: (coins: number) => void;
    startingCoins?: number;
    guestOwnedIds?: string[];
    onGuestPurchase?: (catalogItemId: string) => void;
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
        music: "Music",
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

export function Shop({
    userCurrency,
    lastDailyReward,
    isOnboardingBuyStep,
    onOnboardingPurchase,
    isGuest = false,
    guestCoins,
    onGuestCoinsChange,
    startingCoins = GUEST_STARTING_COINS,
    guestOwnedIds,
    onGuestPurchase,
}: ShopProps) {
    const [activeTab, setActiveTab] = useState<ShopTab>("items");
    const catalogItems = useQuery(api.catalog.list);
    const ownedItemIds = useQuery(api.inventory.getMyInventoryIds, isGuest ? "skip" : undefined);
    const referralStats = useQuery(api.users.getReferralStats, isGuest ? "skip" : undefined);
    const purchaseItem = useMutation(api.inventory.purchaseItem);
    const [purchasing, setPurchasing] = useState<Id<"catalogItems"> | null>(null);
    const [lastResult, setLastResult] = useState<{ itemId: Id<"catalogItems">; message: string; success: boolean } | null>(null);
    const roomTemplates = useQuery(api.roomTemplates.list);
    const ownedTemplateIds = useQuery(api.roomTemplates.listOwnedTemplateIds, isGuest ? "skip" : undefined);
    const purchaseRoom = useMutation(api.roomTemplates.purchaseRoom);
    const [purchasingRoom, setPurchasingRoom] = useState<Id<"roomTemplates"> | null>(null);
    const [lastRoomResult, setLastRoomResult] = useState<{ templateId: Id<"roomTemplates">; message: string; success: boolean } | null>(null);

    const effectiveCoins = isGuest ? Math.max(0, Math.min(guestCoins ?? startingCoins, startingCoins)) : userCurrency;

    const handlePurchase = async (itemId: Id<"catalogItems">) => {
        setPurchasing(itemId);
        setLastResult(null);
        try {
            if (isGuest) {
                const item = catalogItems?.find((c) => c._id === itemId);
                const cost = item?.basePrice ?? 0;
                const budget = purchaseWithBudget(effectiveCoins, cost);
                if (!budget.canPurchase) {
                    setLastResult({ itemId, message: "Not enough coins. Log in to keep purchases.", success: false });
                    return;
                }
                onGuestCoinsChange?.(budget.remaining);
                onGuestPurchase?.(itemId);
                setLastResult({ itemId, message: "Log in to keep purchases.", success: true });
                if (onOnboardingPurchase) {
                    onOnboardingPurchase();
                }
                return;
            }

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
            if (isGuest) {
                setLastRoomResult({
                    templateId,
                    message: "Log in to keep purchases.",
                    success: false,
                });
                return;
            }

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

    const guestOwnedSet = new Set(
        (guestOwnedIds || []).map((id) => id as Id<"catalogItems">)
    );
    const ownedSet = new Set([...(ownedItemIds || []), ...guestOwnedSet]);
    const ownedTemplateSet = new Set(ownedTemplateIds || []);
    const groupedItems = catalogItems ? groupByCategory(catalogItems) : {};
    const categories = Object.keys(groupedItems).sort();
    const purchasableRooms = roomTemplates?.filter(t => !t.isDefault) || [];

    const isLoading = !catalogItems || !roomTemplates;

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const nextRewardText = useMemo(() => {
        if (!lastDailyReward) {
            return "(next coin ready)";
        }
        const nextAvailableAt = lastDailyReward + 24 * 60 * 60 * 1000;
        const diff = nextAvailableAt - now;
        if (diff <= 0) {
            return "(next coin ready)";
        }
        const oneHourMs = 60 * 60 * 1000;
        if (diff < oneHourMs) {
            const minutes = Math.ceil(diff / (60 * 1000));
            return `(next coin in ${minutes} min${minutes === 1 ? "" : "s"})`;
        }
        const hours = Math.ceil(diff / oneHourMs);
        return `(next coin in ${hours} hr${hours === 1 ? "" : "s"})`;
    }, [lastDailyReward, now]);

    const referralText = useMemo(() => {
        const count = referralStats?.referralCoins ?? referralStats?.referralCount ?? 0;
        return `(${count} referral coins so far)`;
    }, [referralStats]);

    const containerClasses =
        "relative bg-[var(--paper)] rounded-xl shadow-lg w-full h-full border-2 border-[var(--ink)] overflow-hidden flex flex-col";

    const content = (
        <div className={containerClasses} onClick={(e) => e.stopPropagation()}>
            {/* Tabs with coins inline */}
            <div className="bg-[var(--paper-header)] border-b-2 border-[var(--ink)] px-4 pt-2 pb-0 shrink-0 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab("items")}
                            className={`relative flex items-center gap-2 px-4 py-2 rounded-t-xl font-bold text-base transition-all border-2 ${
                                activeTab === "items"
                                    ? "bg-[var(--paper)] text-[var(--ink)] border-[var(--ink)] border-b-[var(--paper)] -mb-[2px] z-10 rounded-b-none shadow-none"
                                    : "bg-transparent text-[var(--ink-subtle)] hover:text-[var(--ink)] border-transparent"
                            }`}
                        >
                            <Package className="h-5 w-5" />
                            Items
                            {catalogItems && (
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full border-2 ${
                                        activeTab === "items"
                                            ? "bg-[var(--warning)] text-white border-[var(--ink)]"
                                            : "bg-[var(--muted)] text-[var(--ink-muted)] border-[var(--ink)]"
                                    }`}
                                >
                                    {catalogItems.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab("rooms")}
                            className={`relative flex items-center gap-2 px-4 py-2 rounded-t-xl font-bold text-base transition-all border-2 ${
                                activeTab === "rooms"
                                    ? "bg-[var(--paper)] text-[var(--ink)] border-[var(--ink)] border-b-[var(--paper)] -mb-[2px] z-10 rounded-b-none shadow-none"
                                    : "bg-transparent text-[var(--ink-subtle)] hover:text-[var(--ink)] border-transparent"
                            }`}
                        >
                            <Home className="h-5 w-5" />
                            Rooms
                            {purchasableRooms.length > 0 && (
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full border-2 ${
                                        activeTab === "rooms"
                                            ? "bg-[var(--danger)] text-white border-[var(--ink)]"
                                            : "bg-[var(--muted)] text-[var(--ink-muted)] border-[var(--ink)]"
                                    }`}
                                >
                                    {purchasableRooms.length}
                                </span>
                            )}
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex flex-col items-end leading-tight">
                            <span className="text-xs font-bold text-[var(--ink)]">{nextRewardText}</span>
                            <span className="text-[10px] font-semibold text-[var(--ink-subtle)]">
                                {referralText}
                            </span>
                            {isGuest && (
                                <span className="text-[10px] font-semibold text-[var(--ink-muted)]">
                                    Log in to keep purchases.
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 bg-[var(--warning-light)] rounded-full px-3 py-1 border-2 border-[var(--ink)] shadow-sm">
                            <Coins className="h-4 w-4 text-[var(--warning)]" />
                            <span className="font-bold text-sm text-[var(--ink)]">{effectiveCoins}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shop Content */}
            <div className="p-4 overflow-y-auto flex-1 bg-[var(--paper)]">
                {isLoading ? (
                    <div className="text-center py-12 text-[var(--ink-subtle)]">
                        <div className="animate-pulse text-xl">Loading shop...</div>
                    </div>
                ) : activeTab === "items" ? (
                    <ItemsTab
                        groupedItems={groupedItems}
                        categories={categories}
                        ownedSet={ownedSet}
                        userCurrency={effectiveCoins}
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
    );

    return <div className="w-full h-full font-['Patrick_Hand']">{content}</div>;
}
