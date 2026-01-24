import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Clock, Coins, Flame, Home, Package, Plus, Users, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { GUEST_STARTING_COINS } from "@shared/guestTypes";
import { buildCoinPacks, type CoinPack } from "@shared/coinPacks";
import { ItemsTab } from "./shop/ItemsTab";
import { RoomsTab } from "./shop/RoomsTab";
import { purchaseWithBudget } from "@/room/utils/sessionGuards";
import { useIsUSLocation } from "@/hooks/useIsUSLocation";

import { CATALOG_ITEM_CATEGORIES, type CatalogItemCategory } from "@convex/lib/categories";

type ShopTab = "items" | "rooms";

const CATEGORY_DISPLAY_NAMES: Record<CatalogItemCategory, string> = {
    music: "Music",
    decor: "Decorations",
    furniture: "Furniture",
    computers: "Computers",
    games: "Games",
};
const CATEGORY_COLORS: Record<CatalogItemCategory, string> = {
    music: "from-purple-500 to-pink-600",
    decor: "from-emerald-500 to-teal-600",
    furniture: "from-amber-500 to-orange-600",
    computers: "from-blue-500 to-indigo-600",
    games: "from-red-500 to-rose-600",
};

interface ShopProps {
    userCurrency: number;
    nextRewardAt?: number;
    loginStreak?: number;
    onOnboardingPurchase?: () => void;
    isGuest?: boolean;
    guestCoins?: number;
    onGuestCoinsChange?: (coins: number) => void;
    startingCoins?: number;
    guestOwnedIds?: Id<"catalogItems">[];
    onGuestPurchase?: (catalogItemId: Id<"catalogItems">) => void;
    highlightFirstMusicItem?: boolean;
}

function groupByCategory(items: Doc<"catalogItems">[]) {
    return items.reduce<Record<CatalogItemCategory, Doc<"catalogItems">[]>>((groups, item) => {
        if (!groups[item.category]) {
            groups[item.category] = [];
        }
        groups[item.category].push(item);
        return groups;
    }, {} as Record<CatalogItemCategory, Doc<"catalogItems">[]>);
}

function getCategoryDisplayName(category: CatalogItemCategory): string {
    return CATEGORY_DISPLAY_NAMES[category];
}

function getCategoryColor(category: CatalogItemCategory): string {
    return CATEGORY_COLORS[category];
}

function sortCategories(categories: CatalogItemCategory[]) {
    return categories.sort((a, b) => {
        const orderA = CATALOG_ITEM_CATEGORIES.indexOf(a);
        const orderB = CATALOG_ITEM_CATEGORIES.indexOf(b);
        if (orderA !== orderB) return orderA - orderB;
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
    const ownedInventory = useQuery(api.inventory.getMyInventory, isGuest ? "skip" : undefined);
    const referralStats = useQuery(api.users.getReferralStats, isGuest ? "skip" : undefined);
    const purchaseItem = useMutation(api.inventory.purchaseItem);
    const [purchasing, setPurchasing] = useState<Id<"catalogItems"> | null>(null);
    const [lastResult, setLastResult] = useState<{ itemId: Id<"catalogItems">; message: string; success: boolean } | null>(null);
    const roomTemplates = useQuery(api.roomTemplates.list);
    const ownedTemplateIds = useQuery(api.roomTemplates.listOwnedTemplateIds, isGuest ? "skip" : undefined);
    const purchaseRoom = useMutation(api.roomTemplates.purchaseRoom);
    const [purchasingRoom, setPurchasingRoom] = useState<Id<"roomTemplates"> | null>(null);
    const [lastRoomResult, setLastRoomResult] = useState<{ templateId: Id<"roomTemplates">; message: string; success: boolean } | null>(null);
    const [isCoinPanelOpen, setIsCoinPanelOpen] = useState(false);
    const [coinCheckoutError, setCoinCheckoutError] = useState<string | null>(null);
    const [coinCheckoutLoading, setCoinCheckoutLoading] = useState<string | null>(null);
    const createCoinCheckout = useAction(api.stripe.createCoinCheckout);
    const { isUS, isLoading: isLocationLoading } = useIsUSLocation();

    const coinPackConfig = useMemo(() => {
        const price10 = import.meta.env.VITE_STRIPE_PRICE_10_COINS as string | undefined;
        const price50 = import.meta.env.VITE_STRIPE_PRICE_50_COINS as string | undefined;
        const price150 = import.meta.env.VITE_STRIPE_PRICE_150_COINS as string | undefined;
        const price500 = import.meta.env.VITE_STRIPE_PRICE_500_COINS as string | undefined;
        if (!price10 || !price50 || !price150 || !price500) {
            console.warn("Stripe coin price IDs are missing in env; coin purchase UI will be hidden.");
            return null;
        }
        return buildCoinPacks({
            price10: price10.trim(),
            price50: price50.trim(),
            price150: price150.trim(),
            price500: price500.trim()
        });
    }, []);

    const coinPacks = coinPackConfig?.packs ?? [];

    const effectiveCoins = isGuest ? Math.max(0, Math.min(guestCoins ?? startingCoins, startingCoins)) : userCurrency;

    const handlePurchase = async (itemId: Id<"catalogItems">) => {
        setPurchasing(itemId);
        setLastResult(null);
        try {
            if (isGuest) {
                const item = catalogItems?.find((c: Doc<"catalogItems">) => c._id === itemId);
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

    const handleCoinPurchase = async (pack: CoinPack) => {
        if (isUS === false) {
            setCoinCheckoutError("Currently, we only support customers in the United States.");
            return;
        }
        if (isLocationLoading) {
            setCoinCheckoutError("Please wait while we check your location.");
            return;
        }
        setCoinCheckoutError(null);
        setCoinCheckoutLoading(pack.priceId);
        try {
            const result = await createCoinCheckout({ priceId: pack.priceId });
            if (result.url) {
                if (typeof window !== "undefined") {
                    window.location.assign(result.url);
                }
            } else {
                setCoinCheckoutError("Unable to open Stripe checkout. Please try again.");
            }
        } catch (error) {
            setCoinCheckoutError(
                error instanceof Error ? error.message : "Coin purchase failed. Please try again.",
            );
        } finally {
            setCoinCheckoutLoading(null);
        }
    };

    const toggleCoinPanel = () => {
        setIsCoinPanelOpen((prev) => !prev);
        if (coinCheckoutError) {
            setCoinCheckoutError(null);
        }
    };

    const guestOwnedCounts = useMemo(() => {
        const counts = new Map<Id<"catalogItems">, number>();
        const owned = guestOwnedIds || [];
        const catalogByName = new Map(
            (catalogItems || []).map((item: Doc<"catalogItems">) => [item.name.toLowerCase(), item]),
        );

        owned.forEach((raw) => {
            const match =
                catalogItems?.find((item: Doc<"catalogItems">) => item._id === raw) ??
                catalogByName.get(String(raw).toLowerCase());
            if (match) {
                counts.set(match._id, (counts.get(match._id) ?? 0) + 1);
            }
        });
        return counts;
    }, [guestOwnedIds, catalogItems]);

    const ownedCounts = useMemo(() => {
        const counts = new Map<Id<"catalogItems">, number>();
        ownedInventory?.forEach((item) => {
            const key = item.catalogItemId as Id<"catalogItems">;
            counts.set(key, (counts.get(key) ?? 0) + (item.count ?? 1));
        });
        guestOwnedCounts.forEach((value, key) => {
            counts.set(key, (counts.get(key) ?? 0) + value);
        });
        return counts;
    }, [guestOwnedCounts, ownedInventory]);
    const ownedTemplateSet = useMemo(() => new Set<Id<"roomTemplates">>(ownedTemplateIds || []), [ownedTemplateIds]);
    const groupedItems = catalogItems ? groupByCategory(catalogItems) : ({} as Partial<Record<CatalogItemCategory, Doc<"catalogItems">[]>>);
    const categories = sortCategories(Object.keys(groupedItems) as CatalogItemCategory[]);
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

    useEffect(() => {
        if (isUS === false && isCoinPanelOpen) {
            setIsCoinPanelOpen(false);
        }
    }, [isUS, isCoinPanelOpen]);

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

    const content = (
        <div className="relative bg-background rounded-xl shadow-lg w-full h-full border-2 border-foreground overflow-hidden flex flex-col">
            <div className="bg-secondary border-b-2 border-foreground px-4 pt-2 pb-0 shrink-0 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex gap-1">
                        <button
                            onClick={() => setActiveTab("items")}
                            className={`relative flex items-center gap-2 px-4 py-2 rounded-t-xl font-bold text-size-xl transition-all border-2 ${
                                activeTab === "items"
                                    ? "bg-background text-foreground border-foreground border-b-background -mb-[2px] z-10 rounded-b-none shadow-none"
                                    : "bg-transparent text-[var(--ink-subtle)] hover:text-foreground border-transparent"
                            }`}
                        >
                            <Package className="h-5 w-5" />
                            Items
                            {catalogItems && (
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full border-2 ${
                                        activeTab === "items"
                                            ? "bg-[var(--warning)] text-white border-foreground"
                                            : "bg-muted text-muted-foreground border-foreground"
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
                                    ? "bg-background text-foreground border-foreground border-b-background -mb-[2px] z-10 rounded-b-none shadow-none"
                                    : "bg-transparent text-[var(--ink-subtle)] hover:text-foreground border-transparent"
                            }`}
                        >
                            <Home className="h-5 w-5" />
                            Rooms
                            {purchasableRooms.length > 0 && (
                                <span
                                    className={`text-xs px-2 py-0.5 rounded-full border-2 ${
                                        activeTab === "rooms"
                                            ? "bg-destructive text-destructive-foreground border-foreground"
                                            : "bg-muted text-muted-foreground border-foreground"
                                    }`}
                                >
                                    {purchasableRooms.length}
                                </span>
                            )}
                        </button>
                    </div>
                    <div className="flex items-center gap-3">
                        {!isGuest && (
                            <div className="flex items-center gap-3 text-size-md font-bold text-neutral-500">
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
                        <div className="relative">
                            <button
                                type="button"
                                onClick={!isGuest && (isUS !== false) ? toggleCoinPanel : undefined}
                                disabled={isGuest || isUS === false}
                                className={`group flex items-center bg-secondary rounded-full border-2 border-foreground shadow-sm transition-all ${
                                    !isGuest && (isUS !== false)
                                        ? "hover:bg-background active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                                        : "cursor-default"
                                }`}
                            >
                                <div className="flex items-center gap-2 pl-4 pr-2 py-1.5">
                                    <Coins className="h-4 w-4 text-[var(--warning)]" />
                                    <span className="font-bold text-size-lg text-foreground">
                                        {effectiveCoins.toLocaleString()}
                                    </span>
                                </div>
                                {!isGuest && (isUS !== false) && !isLocationLoading && (
                                    <div
                                        className={`mr-1.5 h-8 w-8 rounded-full flex items-center justify-center transition-all ${
                                            isCoinPanelOpen
                                                ? "bg-foreground text-background"
                                                : "text-foreground group-hover:bg-foreground/10"
                                        }`}
                                    >
                                        {isCoinPanelOpen ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                                    </div>
                                )}
                            </button>
                            {!isGuest && (isUS !== false) && !isLocationLoading && isCoinPanelOpen && (
                                <div
                                    className="absolute right-0 top-full mt-3 w-[240px] bg-background border-2 border-foreground rounded-3xl p-3 shadow-md z-50 animate-in fade-in zoom-in-95 duration-200"
                                    onClick={(event) => event.stopPropagation()}
                                >
                                    {coinPacks.length === 0 ? (
                                        <p className="text-destructive text-xs bg-[var(--danger-light)] p-3 rounded-xl border-2 border-destructive">
                                            Pricing is not configured.
                                        </p>
                                    ) : (
                                        <div className="flex flex-col gap-2">
                                            {coinPacks.map((pack) => (
                                                <button
                                                    key={pack.priceId}
                                                    type="button"
                                                    onClick={() => handleCoinPurchase(pack)}
                                                    disabled={coinCheckoutLoading === pack.priceId}
                                                    className="group flex items-center justify-between rounded-2xl border-2 border-foreground bg-secondary px-4 py-3 text-left shadow-md transition-all hover:bg-[var(--warning-light)] hover:-translate-y-0.5 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 disabled:cursor-not-allowed"
                                                >
                                                    <span className="text-size-lg font-bold text-foreground">
                                                        {pack.coins.toLocaleString()} coins
                                                    </span>
                                                    <span className="bg-background px-2 py-0.5 rounded-lg border-2 border-foreground text-size-md font-bold text-foreground">
                                                        {pack.priceLabel}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {coinCheckoutError && (
                                        <p className="mt-3 text-destructive text-xs bg-[var(--danger-light)] p-2 rounded-xl border-2 border-destructive">
                                            {coinCheckoutError}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 bg-background">
                {isLoading ? (
                    <div className="text-center py-12 text-[var(--ink-subtle)]">
                        <div className="animate-pulse text-xl">Loading shop...</div>
                    </div>
                ) : activeTab === "items" ? (
                <ItemsTab
                    groupedItems={groupedItems}
                    categories={categories}
                    ownedCounts={ownedCounts}
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
