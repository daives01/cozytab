import {
    GUEST_COINS_STORAGE_KEY,
    GUEST_INVENTORY_STORAGE_KEY,
    GUEST_ONBOARDING_STORAGE_KEY,
    GUEST_ROOM_STORAGE_KEY,
    GUEST_SHORTCUTS_STORAGE_KEY,
    GUEST_STARTING_COINS,
    STARTER_COMPUTER_NAME,
    GUEST_CURSOR_COLOR_STORAGE_KEY,
    type GuestRoomItem,
    type GuestSessionState,
    type GuestShortcut,
} from "../../shared/guestTypes";

export const GUEST_STARTER_ITEM_NAME = STARTER_COMPUTER_NAME;

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
    inventoryIds: [GUEST_STARTER_ITEM_NAME],
    roomItems: [],
    shortcuts: [],
    onboardingCompleted: false,
    cursorColor: randomBrightColor(),
};

const clampNumber = (value: unknown, fallback: number, min: number, max: number) => {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    return Math.max(min, Math.min(max, value));
};

const ensureStarterInventory = (ids: string[]) => {
    const seen = new Set(ids.filter((id): id is string => typeof id === "string"));
    if (!seen.has(GUEST_STARTER_ITEM_NAME)) {
        seen.add(GUEST_STARTER_ITEM_NAME);
    }
    return Array.from(seen);
};

export function clampGuestCoins(value: unknown): number {
    return clampNumber(value, GUEST_STARTING_COINS, 0, GUEST_STARTING_COINS);
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

function sanitizeRoomItems(items: unknown): GuestRoomItem[] {
    if (!Array.isArray(items)) return [];
    return items
        .filter((item): item is GuestRoomItem => typeof item === "object" && item !== null)
        .map((item) => ({
            id: typeof item.id === "string" ? item.id : crypto.randomUUID(),
            catalogItemId: typeof item.catalogItemId === "string" ? item.catalogItemId : "",
            x: clampNumber((item as GuestRoomItem).x, 0, -Infinity, Infinity),
            y: clampNumber((item as GuestRoomItem).y, 0, -Infinity, Infinity),
            url: typeof (item as GuestRoomItem).url === "string" ? (item as GuestRoomItem).url : undefined,
            flipped: typeof (item as GuestRoomItem).flipped === "boolean" ? (item as GuestRoomItem).flipped : undefined,
            musicUrl:
                typeof (item as GuestRoomItem).musicUrl === "string"
                    ? (item as GuestRoomItem).musicUrl
                    : undefined,
            musicType: (item as GuestRoomItem).musicType === "youtube"
                ? (item as GuestRoomItem).musicType
                : undefined,
            musicPlaying:
                typeof (item as GuestRoomItem).musicPlaying === "boolean"
                    ? (item as GuestRoomItem).musicPlaying
                    : undefined,
            musicStartedAt:
                typeof (item as GuestRoomItem).musicStartedAt === "number"
                    ? (item as GuestRoomItem).musicStartedAt
                    : undefined,
            musicPositionAtStart:
                typeof (item as GuestRoomItem).musicPositionAtStart === "number"
                    ? (item as GuestRoomItem).musicPositionAtStart
                    : undefined,
            scaleX:
                typeof (item as GuestRoomItem).scaleX === "number"
                    ? (item as GuestRoomItem).scaleX
                    : undefined,
            scaleY:
                typeof (item as GuestRoomItem).scaleY === "number"
                    ? (item as GuestRoomItem).scaleY
                    : undefined,
            rotation:
                typeof (item as GuestRoomItem).rotation === "number"
                    ? (item as GuestRoomItem).rotation
                    : undefined,
            zIndex:
                typeof (item as GuestRoomItem).zIndex === "number"
                    ? (item as GuestRoomItem).zIndex
                    : undefined,
        }))
        .filter((item) => item.catalogItemId);
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

export function readGuestSession(): GuestSessionState {
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

    const parsedInventory = parseJson<string[]>(inventoryRaw, []);
    const parsedCursorColor =
        typeof cursorColorRaw === "string" && cursorColorRaw.trim().length > 0
            ? cursorColorRaw
            : randomBrightColor();

    if (!cursorColorRaw) {
        safeWrite(GUEST_CURSOR_COLOR_STORAGE_KEY, parsedCursorColor);
    }

    return {
        coins: clampGuestCoins(coinsRaw ? Number(coinsRaw) : GUEST_STARTING_COINS),
        inventoryIds: ensureStarterInventory(parsedInventory),
        roomItems: sanitizeRoomItems(parsedRoom.items ?? []),
        shortcuts: sanitizeShortcuts(parsedShortcuts),
        onboardingCompleted: onboardingRaw === "true",
        cursorColor: parsedCursorColor,
    };
}

export function saveGuestRoomItems(items: GuestRoomItem[]) {
    safeWrite(GUEST_ROOM_STORAGE_KEY, JSON.stringify({ items }));
}

export function saveGuestInventory(inventoryIds: string[]) {
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
        inventoryIds: ensureStarterInventory(
            Array.isArray(partial.inventoryIds)
                ? partial.inventoryIds
                : current.inventoryIds
        ),
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

