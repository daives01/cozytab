import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";
import { Clock, Coins, Flame, Home, Package, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GUEST_STARTING_COINS } from "../../shared/guestTypes";
import { ItemsTab } from "./shop/ItemsTab";
import { RoomsTab } from "./shop/RoomsTab";
import { purchaseWithBudget } from "./utils/sessionGuards";

type ShopTab = "items" | "rooms";

const CATEGORY_ORDER = ["music", "decor", "furniture", "computer"] as const;
const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
    music: "Music",
    decor: "Decorations",
    furniture: "Furniture",
    computer: "Computers",
};
const CATEGORY_COLORS: Record<string, string> = {
    music: "from-purple-500 to-pink-600",
    decor: "from-emerald-500 to-teal-600",
    furniture: "from-amber-500 to-orange-600",
    computer: "from-blue-500 to-indigo-600",
};

function normalizeCategory(category: string) {
    const key = category.trim().toLowerCase();
    if (key === "computers") return "computer";
    if (key === "decoration" || key === "decorations") return "decor";
    return key;
}

interface ShopProps {
    userCurrency: number;
    nextRewardAt?: number;
    loginStreak?: number;
    onOnboardingPurchase?: () => void;
    isGuest?: boolean;
    guestCoins?: number;
    onGuestCoinsChange?: (coins: number) => void;
    startingCoins?: number;
    guestOwnedIds?: string[];
    onGuestPurchase?: (catalogItemId: string) => void;
    highlightFirstMusicItem?: boolean;
}

function groupByCategory(items: Doc<"catalogItems">[]) {
    return items.reduce<Record<string, Doc<"catalogItems">[]>>((groups, item) => {
        const key = normalizeCategory(item.category);
        if (!groups[key]) {
            groups[key] = [];
        }
        groups[key].push(item);
        return groups;
    }, {});
}

function getCategoryDisplayName(category: string): string {
    const key = normalizeCategory(category);
    return CATEGORY_DISPLAY_NAMES[key] || key.charAt(0).toUpperCase() + key.slice(1);
}

function getCategoryColor(category: string): string {
    const key = normalizeCategory(category);
    return CATEGORY_COLORS[key] || "from-gray-500 to-gray-600";
}

function sortCategories(categories: string[]) {
    return categories.sort((a, b) => {
        const keyA = normalizeCategory(a) as typeof CATEGORY_ORDER[number];
        const keyB = normalizeCategory(b) as typeof CATEGORY_ORDER[number];
        const orderA = CATEGORY_ORDER.indexOf(keyA);
        const orderB = CATEGORY_ORDER.indexOf(keyB);

        if (orderA !== -1 || orderB !== -1) {
            const resolvedA = orderA === -1 ? CATEGORY_ORDER.length : orderA;
            const resolvedB = orderB === -1 ? CATEGORY_ORDER.length : orderB;
            if (resolvedA !== resolvedB) {
                return resolvedA - resolvedB;
            }
        }

        return a.localeCompare(b);
    });
}

export function Shop({
    userCurrency,
    nextRewardAt,
    loginStreak,
    onOnboardingPurchase,
    isGuest = false,
    guestCoins,
    onGuestCoinsChange,
    startingCoins = GUEST_STARTING_COINS,
    guestOwnedIds,
    onGuestPurchase,
    highlightFirstMusicItem = false,
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
                    setLastResult({ itemId, message: "Not enough cozy coins.", success: false });
                    return;
                }
                onGuestCoinsChange?.(budget.remaining);
                onGuestPurchase?.(itemId);
                setLastResult({ itemId, message: "Purchase successful.", success: true });
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
                    message: "Log in to purchase rooms!",
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

    const guestOwnedSet = useMemo(() => {
        const set = new Set<Id<"catalogItems">>();
        const owned = guestOwnedIds || [];
        const catalogByName = new Map(
            (catalogItems || []).map((item) => [item.name.toLowerCase(), item])
        );

        owned.forEach((raw) => {
            const match =
                catalogItems?.find((item) => item._id === raw) ??
                catalogByName.get(String(raw).toLowerCase());
            if (match) {
                set.add(match._id);
            }
        });
        return set;
    }, [guestOwnedIds, catalogItems]);
    const ownedSet = new Set([...(ownedItemIds || []), ...guestOwnedSet]);
    const ownedTemplateSet = new Set(ownedTemplateIds || []);
    const groupedItems = catalogItems ? groupByCategory(catalogItems) : {};
    const categories = sortCategories(Object.keys(groupedItems));
    const highlightItemId =
        highlightFirstMusicItem && groupedItems.music?.length
            ? groupedItems.music[0]._id
            : null;
    const purchasableRooms = roomTemplates?.filter(t => !t.isDefault) || [];

    const isLoading = !catalogItems || !roomTemplates;

    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), 60_000);
        return () => window.clearInterval(id);
    }, []);

    const nextRewardText = useMemo(() => {
        if (isGuest) return "";
        const target = nextRewardAt;
        if (target == null) return "Ready now";
        const diff = target - now;
        if (diff <= 0) return "Ready now";
        const oneHourMs = 60 * 60 * 1000;
        if (diff < oneHourMs) {
            const minutes = Math.ceil(diff / (60 * 1000));
            return `${minutes} min`;
        }
        const hours = Math.ceil(diff / oneHourMs);
        return `${hours} hr`;
    }, [nextRewardAt, now, isGuest]);

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
                            className={`relative flex items-center gap-2 px-4 py-2 rounded-t-xl font-bold text-size-xl transition-all border-2 ${
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
                            className={`relative flex items-center gap-2 px-4 py-2 rounded-t-xl font-bold text-size-xl transition-all border-2 ${
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
                        {!isGuest && (
                            <div className="flex items-center gap-3 text-xs font-bold text-neutral-500">
                                <div className="flex items-center gap-1.5" title="Login Streak">
                                    <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                                    <span>{loginStreak ?? 0}d streak</span>
                                </div>
                                <div className="h-1 w-1 rounded-full bg-neutral-300" />
                                <div className="flex items-center gap-1.5" title="Next Reward">
                                    <Clock className="h-3.5 w-3.5 text-neutral-400" />
                                    <span>{nextRewardText}</span>
                                </div>
                                {(referralStats?.referralCoins ?? 0) > 0 && (
                                    <>
                                        <div className="h-1 w-1 rounded-full bg-neutral-300" />
                                        <div className="flex items-center gap-1.5" title="Referral Earnings">
                                            <Users className="h-3.5 w-3.5 text-blue-500" />
                                            <span>
                                                {referralStats?.referralCoins} referral
                                                {referralStats?.referralCoins === 1 ? "" : "s"}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
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
                        onPurchase={handlePurchase}
                        getCategoryDisplayName={getCategoryDisplayName}
                        getCategoryColor={getCategoryColor}
                        highlightItemId={highlightItemId}
                    />
                ) : (
                    <RoomsTab
                        purchasableRooms={purchasableRooms}
                        ownedTemplateSet={ownedTemplateSet}
                        userCurrency={userCurrency}
                        purchasingRoom={purchasingRoom}
                        lastRoomResult={lastRoomResult}
                        onPurchaseRoom={handlePurchaseRoom}
                        isGuest={isGuest}
                    />
                )}
            </div>
        </div>
    );

    return <div className="w-full h-full font-['Patrick_Hand']">{content}</div>;
}
