import { describe, expect, test } from "bun:test";
import type { Id } from "@convex/_generated/dataModel";
import type { GuestSessionState, RoomItem, Shortcut } from "@shared/guestTypes";
import {
    createAuthenticatedRoomSessionAdapter,
    createGuestRoomSessionAdapter,
    createRoomSessionStore,
    type RoomSessionSnapshot,
} from "@/room/session";

const catalogItemId = "catalog-1" as Id<"catalogItems">;
const item: RoomItem = { id: "item-1", catalogItemId, x: 10, y: 20 };
const shortcut: Shortcut = {
    id: "shortcut-1",
    name: "Example",
    url: "https://example.com",
    row: 0,
    col: 0,
};

const snapshot: RoomSessionSnapshot = {
    items: [item],
    inventory: [catalogItemId],
    coins: 5,
    computer: { shortcuts: [shortcut], cursorColor: "#123456" },
    profile: { displayName: "Cozy", onboardingCompleted: false },
};

describe("room session store", () => {
    test("initializes the shared state shape from an adapter snapshot", () => {
        const adapter = createAuthenticatedRoomSessionAdapter({
            loadSnapshot: () => snapshot,
            saveItems: () => undefined,
            saveComputer: () => undefined,
            saveDisplayName: () => undefined,
            completeOnboarding: () => undefined,
        });

        const store = createRoomSessionStore(adapter, { mode: "edit", drawerOpen: true });

        expect(store.getState()).toEqual({
            session: { kind: "authenticated-owner", loaded: true },
            persisted: snapshot,
            ephemeral: {
                mode: "edit",
                selectedItemId: null,
                drawerOpen: true,
                draggedItemId: null,
                computerOpen: false,
                shareModalOpen: false,
                musicPlayerItemId: null,
                musicInteractionToken: 0,
            },
        });
    });

    test("notifies subscribers only when state changes", () => {
        const adapter = createAuthenticatedRoomSessionAdapter({
            loadSnapshot: () => snapshot,
            saveItems: () => undefined,
            saveComputer: () => undefined,
            saveDisplayName: () => undefined,
            completeOnboarding: () => undefined,
        });
        const store = createRoomSessionStore(adapter);
        const updates: string[] = [];
        const unsubscribe = store.subscribe((state) => updates.push(state.ephemeral.mode));

        store.setState((state) => ({
            ...state,
            ephemeral: { ...state.ephemeral, mode: "edit" },
        }));
        store.setState(store.getState());
        unsubscribe();
        store.setState((state) => ({
            ...state,
            ephemeral: { ...state.ephemeral, mode: "view" },
        }));

        expect(updates).toEqual(["edit"]);
    });
});

describe("room session adapters", () => {
    test("normalizes guest snapshots and delegates domain saves to guest storage", () => {
        const session: GuestSessionState = {
            coins: 3,
            inventoryIds: [catalogItemId],
            roomItems: [item],
            shortcuts: [{ id: "legacy", name: "Legacy", url: "https://example.com" }],
            onboardingCompleted: false,
            cursorColor: "#abcdef",
        };
        const saved: Partial<GuestSessionState>[] = [];
        const adapter = createGuestRoomSessionAdapter({
            loadSession: () => session,
            saveSession: (changes) => {
                saved.push(changes);
                return { ...session, ...changes };
            },
        });

        expect(adapter.load()).toEqual({
            items: [item],
            inventory: [catalogItemId],
            coins: 3,
            computer: {
                shortcuts: [{ id: "legacy", name: "Legacy", url: "https://example.com", row: 0, col: 0 }],
                cursorColor: "#abcdef",
            },
            profile: { displayName: null, onboardingCompleted: false },
        });

        adapter.saveItems([]);
        adapter.saveComputer({ shortcuts: [shortcut], cursorColor: "#654321" });
        adapter.saveProfile({ onboardingCompleted: true });

        expect(saved).toEqual([
            { roomItems: [] },
            { shortcuts: [shortcut], cursorColor: "#654321" },
            { onboardingCompleted: true },
        ]);
    });

    test("routes authenticated persistence through the supplied Convex operations", async () => {
        const calls: string[] = [];
        const adapter = createAuthenticatedRoomSessionAdapter({
            loadSnapshot: () => snapshot,
            saveItems: (items) => calls.push(`items:${items.length}`),
            saveComputer: (computer) => calls.push(`computer:${computer.shortcuts.length}`),
            saveDisplayName: (name) => calls.push(`name:${name}`),
            completeOnboarding: () => calls.push("onboarding"),
        });

        await adapter.saveItems([]);
        await adapter.saveComputer({ shortcuts: [], cursorColor: null });
        await adapter.saveProfile({ displayName: "New name", onboardingCompleted: true });

        expect(calls).toEqual(["items:0", "computer:0", "name:New name", "onboarding"]);
    });
});
