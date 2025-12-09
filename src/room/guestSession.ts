import type { Id } from "../../convex/_generated/dataModel";
import {
    GUEST_COINS_STORAGE_KEY,
    GUEST_INVENTORY_STORAGE_KEY,
    GUEST_ONBOARDING_STORAGE_KEY,
    GUEST_ROOM_STORAGE_KEY,
    GUEST_SHORTCUTS_STORAGE_KEY,
    GUEST_STARTING_COINS,
    GUEST_CURSOR_COLOR_STORAGE_KEY,
    type GuestRoomItem,
    type GuestSessionState,
    type GuestShortcut,
} from "../../shared/guestTypes";

function randomBrightColor(): string {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.floor(Math.random() * 30);
    const lightness = 55 + Math.floor(Math.random() * 15);
    return hslToHex(hue, saturation, lightness);
}

function hslToHex(h: number, s: number, l: number): string {
    const sat = s / 100;
    const light = l / 100;
    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = light - c / 2;
    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }

    const toHex = (value: number) => {
        const hex = Math.round((value + m) * 255).toString(16).padStart(2, "0");
        return hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const defaultState: GuestSessionState = {
    coins: GUEST_STARTING_COINS,
    inventoryIds: [],
    roomItems: [],
    shortcuts: [],
    onboardingCompleted: false,
    cursorColor: randomBrightColor(),
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    return Math.max(min, Math.min(max, value));
};

export function clampGuestCoins(value: unknown): number {
    return clampNumber(value, GUEST_STARTING_COINS, 0, GUEST_STARTING_COINS);
}

export type CatalogLookup = {
    byId: Set<Id<"catalogItems">>;
    starterIds: Id<"catalogItems">[];
};

export function buildCatalogLookup(
    catalogItems: { _id: Id<"catalogItems">; name: string; isStarterItem?: boolean }[] | undefined
): CatalogLookup | null {
    if (!catalogItems || catalogItems.length === 0) return null;
    const byId = new Set<Id<"catalogItems">>();
    const starterIds: Id<"catalogItems">[] = [];

    for (const item of catalogItems) {
        byId.add(item._id);
        if (item.isStarterItem) starterIds.push(item._id);
    }

    return { byId, starterIds };
}

function safeRead(key: string) {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function safeWrite(key: string, value: string) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(key, value);
    } catch {
        // ignore storage errors
    }
}

function safeRemove(key: string) {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

function parseJson<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        const parsed = JSON.parse(raw);
        return parsed as T;
    } catch {
        return fallback;
    }
}

function sanitizeRoomItems(items: GuestRoomItem[]): GuestRoomItem[] {
    return items
        .filter((item): item is GuestRoomItem => typeof item === "object" && item !== null)
        .map((item) => ({
            ...item,
            id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
            x: clampNumber(item.x, 0, 0, Infinity),
            y: clampNumber(item.y, 0, 0, Infinity),
        }));
}

function normalizeGuestSession(
    raw: GuestSessionState,
    catalogLookup: CatalogLookup | null
): GuestSessionState {
    const filterIds = (ids: Id<"catalogItems">[]) =>
        catalogLookup ? ids.filter((id) => catalogLookup.byId.has(id)) : ids;
    const starterIds = catalogLookup?.starterIds ?? [];

    const inventoryIds = Array.from(new Set([...filterIds(raw.inventoryIds), ...starterIds]));
    const allowedIds = new Set(inventoryIds);
    const normalizedRoomItems = raw.roomItems.filter((item) =>
        catalogLookup ? catalogLookup.byId.has(item.catalogItemId) : true
    );
    normalizedRoomItems.forEach((item) => allowedIds.add(item.catalogItemId));

    return {
        coins: raw.coins,
        inventoryIds: Array.from(allowedIds),
        roomItems: normalizedRoomItems,
        shortcuts: raw.shortcuts,
        onboardingCompleted: raw.onboardingCompleted,
        cursorColor: raw.cursorColor,
    };
}

function sanitizeShortcuts(shortcuts: unknown): GuestShortcut[] {
    if (!Array.isArray(shortcuts)) return [];
    return shortcuts
        .filter((shortcut): shortcut is GuestShortcut => typeof shortcut === "object" && shortcut !== null)
        .map((shortcut) => ({
            id: typeof shortcut.id === "string" ? shortcut.id : crypto.randomUUID(),
            name: typeof shortcut.name === "string" ? shortcut.name : "Link",
            url: typeof shortcut.url === "string" ? shortcut.url : "",
            row: typeof shortcut.row === "number" ? shortcut.row : undefined,
            col: typeof shortcut.col === "number" ? shortcut.col : undefined,
        }))
        .filter((shortcut) => shortcut.url);
}

export function readGuestSession(catalogLookup: CatalogLookup | null = null): GuestSessionState {
    if (typeof window === "undefined") {
        return { ...defaultState };
    }

    const coinsRaw = safeRead(GUEST_COINS_STORAGE_KEY);
    const inventoryRaw = safeRead(GUEST_INVENTORY_STORAGE_KEY);
    const onboardingRaw = safeRead(GUEST_ONBOARDING_STORAGE_KEY);
    const roomRaw = safeRead(GUEST_ROOM_STORAGE_KEY);
    const shortcutsRaw = safeRead(GUEST_SHORTCUTS_STORAGE_KEY);
    const cursorColorRaw = safeRead(GUEST_CURSOR_COLOR_STORAGE_KEY);

    const parsedRoom = parseJson<{ items?: GuestRoomItem[] }>(roomRaw, { items: [] });
    const parsedShortcuts = parseJson<GuestShortcut[]>(shortcutsRaw, []);

    const parsedInventory = parseJson<Id<"catalogItems">[]>(inventoryRaw, []);
    const parsedCursorColor =
        typeof cursorColorRaw === "string" && cursorColorRaw.trim().length > 0
            ? cursorColorRaw
            : randomBrightColor();

    if (!cursorColorRaw) {
        safeWrite(GUEST_CURSOR_COLOR_STORAGE_KEY, parsedCursorColor);
    }

    return normalizeGuestSession(
        {
            coins: clampGuestCoins(coinsRaw ? Number(coinsRaw) : GUEST_STARTING_COINS),
            inventoryIds: parsedInventory,
            roomItems: sanitizeRoomItems(parsedRoom.items ?? []),
            shortcuts: sanitizeShortcuts(parsedShortcuts),
            onboardingCompleted: onboardingRaw === "true",
            cursorColor: parsedCursorColor,
        },
        catalogLookup
    );
}

export function saveGuestRoomItems(items: GuestRoomItem[]) {
    safeWrite(GUEST_ROOM_STORAGE_KEY, JSON.stringify({ items }));
}

export function saveGuestInventory(inventoryIds: Id<"catalogItems">[]) {
    safeWrite(GUEST_INVENTORY_STORAGE_KEY, JSON.stringify(inventoryIds));
}

export function saveGuestCoins(nextCoins: number): number {
    const clamped = clampGuestCoins(nextCoins);
    safeWrite(GUEST_COINS_STORAGE_KEY, String(clamped));
    return clamped;
}

export function saveGuestShortcuts(shortcuts: GuestShortcut[]) {
    safeWrite(GUEST_SHORTCUTS_STORAGE_KEY, JSON.stringify(shortcuts));
}

export function saveGuestCursorColor(color: string) {
    if (typeof color !== "string" || color.trim().length === 0) return;
    safeWrite(GUEST_CURSOR_COLOR_STORAGE_KEY, color);
}

export function saveGuestOnboarding(completed: boolean) {
    if (completed) {
        safeWrite(GUEST_ONBOARDING_STORAGE_KEY, "true");
    } else {
        safeRemove(GUEST_ONBOARDING_STORAGE_KEY);
    }

    if (typeof window !== "undefined") {
        try {
            if (completed) {
                sessionStorage.setItem(GUEST_ONBOARDING_STORAGE_KEY, "true");
            } else {
                sessionStorage.removeItem(GUEST_ONBOARDING_STORAGE_KEY);
            }
        } catch {
            // ignore
        }
    }
}

export function markGuestOnboardingComplete() {
    saveGuestOnboarding(true);
}

export function clearGuestSession() {
    [
        GUEST_ROOM_STORAGE_KEY,
        GUEST_COINS_STORAGE_KEY,
        GUEST_INVENTORY_STORAGE_KEY,
        GUEST_SHORTCUTS_STORAGE_KEY,
        GUEST_ONBOARDING_STORAGE_KEY,
        GUEST_CURSOR_COLOR_STORAGE_KEY,
    ].forEach((key) => safeRemove(key));
}

export function saveGuestSession(partial: Partial<GuestSessionState>): GuestSessionState {
    const current = readGuestSession();

    const next: GuestSessionState = {
        coins: clampGuestCoins(partial.coins ?? current.coins),
        inventoryIds: Array.isArray(partial.inventoryIds) ? partial.inventoryIds : current.inventoryIds,
        roomItems: partial.roomItems ? sanitizeRoomItems(partial.roomItems) : current.roomItems,
        shortcuts: partial.shortcuts ? sanitizeShortcuts(partial.shortcuts) : current.shortcuts,
        onboardingCompleted: partial.onboardingCompleted ?? current.onboardingCompleted,
        cursorColor:
            typeof partial.cursorColor === "string" && partial.cursorColor.trim().length > 0
                ? partial.cursorColor
                : current.cursorColor,
    };

    saveGuestCoins(next.coins);
    saveGuestInventory(next.inventoryIds);
    saveGuestRoomItems(next.roomItems);
    saveGuestShortcuts(next.shortcuts);
    saveGuestCursorColor(next.cursorColor);
    if (next.onboardingCompleted) {
        saveGuestOnboarding(true);
    }

    return next;
}

