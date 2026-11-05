import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
    GUEST_COINS_STORAGE_KEY,
    GUEST_CURSOR_COLOR_STORAGE_KEY,
    GUEST_INVENTORY_STORAGE_KEY,
    GUEST_ONBOARDING_STORAGE_KEY,
    GUEST_ROOM_STORAGE_KEY,
    GUEST_SHORTCUTS_STORAGE_KEY,
} from "@shared/guestTypes";
import { resolveBrowserGuestProgress } from "@/guest/guestConversion";
import { saveReferralCode } from "@/referralStorage";

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
const originalSessionStorage = globalThis.sessionStorage;

const guestKeys = [
    GUEST_ROOM_STORAGE_KEY,
    GUEST_COINS_STORAGE_KEY,
    GUEST_INVENTORY_STORAGE_KEY,
    GUEST_SHORTCUTS_STORAGE_KEY,
    GUEST_ONBOARDING_STORAGE_KEY,
    GUEST_CURSOR_COLOR_STORAGE_KEY,
];

beforeEach(() => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: globalThis });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: new MemoryStorage() });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: new MemoryStorage() });
    localStorage.setItem(GUEST_COINS_STORAGE_KEY, "3");
    localStorage.setItem(GUEST_INVENTORY_STORAGE_KEY, "[]");
    localStorage.setItem(GUEST_ROOM_STORAGE_KEY, JSON.stringify({ items: [] }));
    localStorage.setItem(GUEST_SHORTCUTS_STORAGE_KEY, "[]");
    localStorage.setItem(GUEST_ONBOARDING_STORAGE_KEY, "true");
    sessionStorage.setItem(GUEST_ONBOARDING_STORAGE_KEY, "true");
    localStorage.setItem(GUEST_CURSOR_COLOR_STORAGE_KEY, "#123456");
    saveReferralCode("FRIEND");
});

afterEach(() => {
    Object.defineProperty(globalThis, "window", { configurable: true, value: originalWindow });
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: originalLocalStorage });
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: originalSessionStorage });
});

describe("browser Guest Conversion", () => {
    test.each(["preserved", "discarded_existing_user"] as const)(
        "clears Guest Progress and referral after %s",
        async (disposition) => {
            let received: unknown;

            const result = await resolveBrowserGuestProgress({
                username: "Guest",
                resolveGuestProgress: async (args) => {
                    received = args;

                    return { disposition };
                },
            });

            expect(result).toEqual({ disposition });
            expect(received).toMatchObject({
                username: "Guest",
                referralCode: "FRIEND",
                guestProgress: { coins: 3, onboardingCompleted: true, cursorColor: "#123456" },
            });

            for (const key of guestKeys) {
                expect(localStorage.getItem(key)).toBeNull();
                expect(sessionStorage.getItem(key)).toBeNull();
            }

            expect(localStorage.getItem("cozytab_referral_code")).toBeNull();
            expect(sessionStorage.getItem("cozytab_referral_code")).toBeNull();
        },
    );

    test("keeps Guest Progress and referral when resolution fails", async () => {
        await expect(
            resolveBrowserGuestProgress({
                username: "Guest",
                resolveGuestProgress: async () => {
                    throw new Error("offline");
                },
            }),
        ).rejects.toThrow("offline");

        expect(localStorage.getItem(GUEST_COINS_STORAGE_KEY)).toBe("3");
        expect(localStorage.getItem(GUEST_ONBOARDING_STORAGE_KEY)).toBe("true");
        expect(sessionStorage.getItem(GUEST_ONBOARDING_STORAGE_KEY)).toBe("true");
        expect(localStorage.getItem("cozytab_referral_code")).toBe("FRIEND");
    });
});
