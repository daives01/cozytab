import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { GUEST_STARTING_COINS, type GuestShortcut, type RoomItem } from "@shared/guestTypes";
import { normalizeShortcutsWithGrid } from "./userSettings";

const MAX_GUEST_ITEMS = 100;

export function clampGuestCoins(value: unknown): number {
    if (typeof value !== "number" || Number.isNaN(value)) return GUEST_STARTING_COINS;
    return Math.max(0, Math.min(GUEST_STARTING_COINS, value));
}

export async function importInventoryWithinBudget(
    ctx: MutationCtx,
    userId: Id<"users">,
    guestInventory: string[],
    reportedCoins: number,
) {
    const inventoryNames = new Set<string>();
    const catalogItems: Doc<"catalogItems">[] = await ctx.db.query("catalogItems").collect();
    const totalBudget = GUEST_STARTING_COINS;
    const maxSpend = Math.max(0, totalBudget - Math.max(0, reportedCoins));
    let spent = 0;
    const counts = new Map<Id<"catalogItems">, number>();
    const starterFreeGranted = new Set<Id<"catalogItems">>();
    for (const idOrName of guestInventory) {
        const item = catalogItems.find((candidate) => candidate.name === idOrName || candidate._id === idOrName);
        if (!item) continue;
        const cost = item.isStarterItem && !starterFreeGranted.has(item._id) ? 0 : item.basePrice;
        if (spent + cost > maxSpend) continue;
        inventoryNames.add(item.name);
        spent += cost;
        if (item.isStarterItem && cost === 0) starterFreeGranted.add(item._id);
        counts.set(item._id, (counts.get(item._id) ?? 0) + 1);
    }
    for (const item of catalogItems.filter((candidate) => candidate.isStarterItem)) {
        if (!counts.has(item._id)) {
            counts.set(item._id, 1);
            inventoryNames.add(item.name);
        }
    }
    for (const [catalogItemId, count] of counts) {
        await ctx.db.insert("inventory", { userId, catalogItemId, purchasedAt: Date.now(), count });
    }
    return { remainingCurrency: Math.max(0, totalBudget - spent), inventoryNames, catalogItems };
}

export async function ensureStarterInventory(ctx: MutationCtx, userId: Id<"users">) {
    const catalogItems: Doc<"catalogItems">[] = await ctx.db.query("catalogItems").collect();
    const starters = catalogItems.filter((item) => item.isStarterItem);
    const inventory = await ctx.db
        .query("inventory")
        .withIndex("by_user", (query) => query.eq("userId", userId))
        .collect();
    const byCatalog = new Map(inventory.map((item) => [item.catalogItemId, item]));
    let ensured = false;
    for (const starter of starters) {
        const existing = byCatalog.get(starter._id);
        if (!existing) {
            await ctx.db.insert("inventory", {
                userId,
                catalogItemId: starter._id,
                purchasedAt: Date.now(),
                hidden: false,
                count: 1,
            });
            ensured = true;
        } else if ((existing.count ?? 1) <= 0) {
            await ctx.db.patch(existing._id, { count: 1 });
            ensured = true;
        }
    }
    return { catalogItems, ensured };
}

export function sanitizeRoomItems(
    items: RoomItem[] | undefined,
    catalogByName: Map<string, Id<"catalogItems">>,
    catalogIds: Set<Id<"catalogItems">>,
) {
    return (items ?? []).slice(0, MAX_GUEST_ITEMS).flatMap((item) => {
        const candidate = item.catalogItemId as Id<"catalogItems">;
        const catalogItemId = catalogIds.has(candidate) ? candidate : catalogByName.get(item.catalogItemId);
        if (!catalogItemId) return [];
        return [
            {
                ...item,
                catalogItemId,
                x: Number.isFinite(item.x) ? item.x : 0,
                y: Number.isFinite(item.y) ? item.y : 0,
            },
        ];
    });
}

export function sanitizeGuestShortcuts(shortcuts: GuestShortcut[] | undefined) {
    return normalizeShortcutsWithGrid(
        (shortcuts ?? []).slice(0, MAX_GUEST_ITEMS).map(({ id, name, url, row, col }) => ({ id, name, url, row, col })),
    );
}

export async function seedRoomFromGuest(
    ctx: MutationCtx,
    userId: Id<"users">,
    templateId: Id<"roomTemplates">,
    templateName: string,
    guestItems: RoomItem[] | undefined,
    catalogByName: Map<string, Id<"catalogItems">>,
    catalogIds: Set<Id<"catalogItems">>,
) {
    await ctx.db.insert("rooms", {
        userId,
        templateId,
        name: templateName,
        isActive: true,
        items: sanitizeRoomItems(guestItems, catalogByName, catalogIds),
    });
}
