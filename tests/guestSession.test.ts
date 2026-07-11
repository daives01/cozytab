import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type { Id } from "@convex/_generated/dataModel";
import {
    GUEST_COINS_STORAGE_KEY,
    GUEST_INVENTORY_STORAGE_KEY,
    GUEST_ROOM_STORAGE_KEY,
    GUEST_SHORTCUTS_STORAGE_KEY,
    GUEST_STARTING_COINS,
} from "@shared/guestTypes";
import {
    buildCatalogLookup,
    clampGuestCoins,
    readGuestSession,
    saveGuestCoins,
} from "@/guest/guestSession";

class MemoryStorage implements Storage {
    private values = new Map<string, string>();

    get length() {
        return this.values.size;
    }

    clear() {
        this.values.clear();
    }

    getItem(key: string) {
        return this.values.get(key) ?? null;
    }

    key(index: number) {
        return [...this.values.keys()][index] ?? null;
    }

    removeItem(key: string) {
        this.values.delete(key);
    }

    setItem(key: string, value: string) {
        this.values.set(key, String(value));
    }
}

const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
    const storage = new MemoryStorage();
    Object.defineProperty(globalThis, "window", { configurable: true, value: globalThis });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
});

afterEach(() => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
});

describe("guest session storage", () => {
    test("falls back safely for malformed JSON and coin data", () => {
        localStorage.setItem(GUEST_INVENTORY_STORAGE_KEY, "not json");
        localStorage.setItem(GUEST_ROOM_STORAGE_KEY, "{");
        localStorage.setItem(GUEST_SHORTCUTS_STORAGE_KEY, "null");
        localStorage.setItem(GUEST_COINS_STORAGE_KEY, "not a number");

        const session = readGuestSession();

        expect(session.coins).toBe(GUEST_STARTING_COINS);
        expect(session.inventoryIds).toEqual([]);
        expect(session.roomItems).toEqual([]);
        expect(session.shortcuts).toEqual([]);
    });

    test("normalizes legacy shortcuts and drops unusable links", () => {
        localStorage.setItem(
            GUEST_SHORTCUTS_STORAGE_KEY,
            JSON.stringify([
                { id: "docs", name: "Docs", url: "https://example.com" },
                { id: 12, name: 42, url: "https://legacy.example", row: "2", col: null },
                { id: "empty", name: "Empty", url: "" },
                null,
            ])
        );

        const session = readGuestSession();

        expect(session.shortcuts).toHaveLength(2);
        expect(session.shortcuts[0]).toEqual({
            id: "docs",
            name: "Docs",
            url: "https://example.com",
            row: undefined,
            col: undefined,
        });
        expect(session.shortcuts[1].id).toBeString();
        expect(session.shortcuts[1].name).toBe("Link");
        expect(session.shortcuts[1].row).toBeUndefined();
        expect(session.shortcuts[1].col).toBeUndefined();
    });

    test("sanitizes item identities and non-negative coordinates", () => {
        const catalogItemId = "catalog-1" as Id<"catalogItems">;
        localStorage.setItem(
            GUEST_ROOM_STORAGE_KEY,
            JSON.stringify({
                items: [
                    { id: 123, catalogItemId, x: -40, y: "bad" },
                    null,
                ],
            })
        );

        const [item] = readGuestSession().roomItems;

        expect(item.id).toBeString();
        expect(item.catalogItemId).toBe(catalogItemId);
        expect(item.x).toBe(0);
        expect(item.y).toBe(0);
    });

    test("filters stale catalog data and grants each starter exactly once", () => {
        const starterId = "starter" as Id<"catalogItems">;
        const paidId = "paid" as Id<"catalogItems">;
        const staleId = "stale" as Id<"catalogItems">;
        const lookup = buildCatalogLookup([
            { _id: starterId, name: "Starter", isStarterItem: true },
            { _id: paidId, name: "Paid" },
        ]);
        localStorage.setItem(GUEST_INVENTORY_STORAGE_KEY, JSON.stringify([paidId, paidId, staleId]));
        localStorage.setItem(
            GUEST_ROOM_STORAGE_KEY,
            JSON.stringify({
                items: [
                    { id: "kept", catalogItemId: paidId, x: 1, y: 2 },
                    { id: "stale", catalogItemId: staleId, x: 1, y: 2 },
                ],
            })
        );

        const session = readGuestSession(lookup);

        expect(session.inventoryIds).toEqual([paidId, paidId, starterId]);
        expect(session.roomItems.map((item) => item.id)).toEqual(["kept"]);
    });

    test("clamps loaded and saved coins to the guest budget", () => {
        expect(clampGuestCoins(-2)).toBe(0);
        expect(clampGuestCoins(99)).toBe(GUEST_STARTING_COINS);
        expect(clampGuestCoins(undefined)).toBe(GUEST_STARTING_COINS);

        expect(saveGuestCoins(99)).toBe(GUEST_STARTING_COINS);
        expect(localStorage.getItem(GUEST_COINS_STORAGE_KEY)).toBe(String(GUEST_STARTING_COINS));
    });
});
