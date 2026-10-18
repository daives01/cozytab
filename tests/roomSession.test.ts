import { describe, expect, test } from "bun:test";
import type { Id } from "@convex/_generated/dataModel";
import type { GuestSessionState, RoomItem } from "@shared/guestTypes";
import {
    createAuthenticatedRoomPersistence,
    createGuestRoomPersistence,
    createRoomEditingSession,
    type RoomPersistence,
    type RoomSessionScheduler,
} from "@/room/session";
import { createRoomSessionLifecycle } from "@/room/session/roomSessionLifecycle";

const chairId = "chair" as Id<"catalogItems">;
const lampId = "lamp" as Id<"catalogItems">;
const chair: RoomItem = { id: "chair-1", catalogItemId: chairId, x: 10, y: 20, flipped: false };

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });
    return { promise, resolve, reject };
}

function manualScheduler() {
    const tasks = new Map<number, () => void>();
    let nextId = 0;
    const scheduler: RoomSessionScheduler = {
        schedule: (task) => {
            const id = ++nextId;
            tasks.set(id, task);
            return () => tasks.delete(id);
        },
    };
    return {
        scheduler,
        runAll: () => {
            const pending = [...tasks.values()];
            tasks.clear();
            pending.forEach((task) => task());
        },
        size: () => tasks.size,
    };
}

function persistence(items: RoomItem[] = [chair]) {
    const saves: RoomItem[][] = [];
    const adapter: RoomPersistence = {
        load: () => items,
        save: async (next) => {
            saves.push(next);
            return next;
        },
    };
    return { adapter, saves };
}

describe("Room Editing Session", () => {
    test("stays active through React Strict Mode's effect replay", () => {
        const { adapter } = persistence([]);
        const session = createRoomEditingSession({ roomId: "room-1", persistence: adapter });
        const deferredTasks: Array<() => void> = [];
        const activateLifecycle = createRoomSessionLifecycle(session, (task) => deferredTasks.push(task));

        const cleanupFirstEffect = activateLifecycle();
        cleanupFirstEffect();
        const cleanupReplayedEffect = activateLifecycle();
        deferredTasks.splice(0).forEach((task) => task());

        session.enterEditMode();
        expect(session.getSnapshot().mode).toBe("edit");

        cleanupReplayedEffect();
        deferredTasks.splice(0).forEach((task) => task());
        session.exitEditMode();
        expect(session.getSnapshot().mode).toBe("edit");
    });

    test("hydrates exactly once when the session is created", () => {
        let loads = 0;
        const session = createRoomEditingSession({
            roomId: "room-1",
            persistence: { load: () => (++loads, [chair]), save: async (items) => items },
        });

        session.getSnapshot();
        session.getSnapshot();

        expect(loads).toBe(1);
        expect(session.getSnapshot().items).toEqual([chair]);
    });

    test("accepts place, move, flip, and remove intentions", () => {
        const { adapter } = persistence([]);
        const session = createRoomEditingSession({
            roomId: "room-1",
            persistence: adapter,
            ownedCount: () => 1,
            createItemId: () => "lamp-1",
        });
        session.enterEditMode();

        expect(session.beginPlacement(lampId)).toEqual({ accepted: true });
        expect(session.getSnapshot().placingCatalogItemId).toBe(lampId);
        expect(session.place({ catalogItemId: lampId, x: -20, y: 30 })).toEqual({ accepted: true, itemId: "lamp-1" });
        expect(session.getSnapshot().placingCatalogItemId).toBeNull();
        expect(session.move("lamp-1", { x: 80, y: 90 })).toEqual({ accepted: true });
        expect(session.flip("lamp-1")).toEqual({ accepted: true });
        expect(session.getSnapshot().items[0]).toMatchObject({ id: "lamp-1", x: 80, y: 90, flipped: true });
        expect(session.remove("lamp-1")).toEqual({ accepted: true });
        expect(session.getSnapshot().items).toEqual([]);
    });

    test("derives placement eligibility and defensively rejects insufficient ownership", () => {
        const { adapter } = persistence([chair]);
        const session = createRoomEditingSession({
            roomId: "room-1",
            persistence: adapter,
            ownedCount: (id) => id === chairId ? 1 : 0,
        });
        session.enterEditMode();

        expect(session.placementEligibility(chairId)).toEqual({ allowed: false, ownedCount: 1, placedCount: 1, remaining: 0 });
        expect(session.place({ catalogItemId: chairId, x: 0, y: 0 })).toEqual({ accepted: false, reason: "insufficient-ownership" });
        expect(session.place({ catalogItemId: lampId, x: 0, y: 0 })).toEqual({ accepted: false, reason: "insufficient-ownership" });
        expect(session.getSnapshot().items).toEqual([chair]);
    });

    test("coalesces debounced structural edits into one save", async () => {
        const clock = manualScheduler();
        const { adapter, saves } = persistence([chair]);
        const session = createRoomEditingSession({ roomId: "room-1", persistence: adapter, scheduler: clock.scheduler });
        session.enterEditMode();

        session.move("chair-1", { x: 30, y: 40 });
        session.flip("chair-1");
        expect(clock.size()).toBe(1);
        clock.runAll();
        await Promise.resolve();
        await Promise.resolve();

        expect(saves).toHaveLength(1);
        expect(saves[0][0]).toMatchObject({ x: 30, y: 40, flipped: true });
        expect(session.getSnapshot().saveStatus).toBe("clean");
    });

    test("saves visitor-observable item changes immediately", async () => {
        const clock = manualScheduler();
        const { adapter, saves } = persistence([chair]);
        const session = createRoomEditingSession({ roomId: "room-1", persistence: adapter, scheduler: clock.scheduler });

        expect(session.changePersistedItem("chair-1", { musicPlaying: true, musicStartedAt: 123 }, "visitor-observable")).toEqual({ accepted: true });
        await Promise.resolve();
        await Promise.resolve();

        expect(saves).toHaveLength(1);
        expect(clock.size()).toBe(0);
    });

    test("enters view mode immediately and flushes when editing ends", async () => {
        const clock = manualScheduler();
        const { adapter, saves } = persistence([chair]);
        const session = createRoomEditingSession({ roomId: "room-1", persistence: adapter, scheduler: clock.scheduler });
        session.enterEditMode();
        session.move("chair-1", { x: 50, y: 60 });

        session.exitEditMode();
        expect(session.getSnapshot().mode).toBe("view");
        await Promise.resolve();
        await Promise.resolve();

        expect(saves).toHaveLength(1);
    });

    test("keeps failed edits unsaved and retries on the next flush", async () => {
        let attempts = 0;
        const session = createRoomEditingSession({
            roomId: "room-1",
            persistence: {
                load: () => [chair],
                save: async (items) => {
                    attempts += 1;
                    if (attempts === 1) throw new Error("network");
                    return items;
                },
            },
        });
        session.enterEditMode();
        session.move("chair-1", { x: 25, y: 35 });

        await session.flush();
        expect(session.getSnapshot().saveStatus).toBe("unsaved");
        await session.flush();

        expect(attempts).toBe(2);
        expect(session.getSnapshot().saveStatus).toBe("clean");
    });

    test("does not let an older save response overwrite newer edits", async () => {
        const first = deferred<RoomItem[]>();
        const saves: RoomItem[][] = [];
        const session = createRoomEditingSession({
            roomId: "room-1",
            persistence: {
                load: () => [chair],
                save: (items) => {
                    saves.push(items);
                    return saves.length === 1 ? first.promise : Promise.resolve(items);
                },
            },
        });
        session.enterEditMode();
        session.move("chair-1", { x: 30, y: 20 });
        const firstFlush = session.flush();
        session.move("chair-1", { x: 90, y: 20 });

        first.resolve([{ ...chair, x: 31 }]);
        await firstFlush;

        expect(session.getSnapshot().items[0].x).toBe(90);
        expect(session.getSnapshot().saveStatus).toBe("unsaved");
    });
});

describe("room persistence adapters", () => {
    test("guest and authenticated adapters share canonical load/save behavior", async () => {
        const guestState: GuestSessionState = {
            coins: 0,
            inventoryIds: [],
            roomItems: [chair],
            shortcuts: [],
            onboardingCompleted: false,
            cursorColor: "#000000",
        };
        let savedGuest = guestState;
        const guest = createGuestRoomPersistence({
            loadSession: () => savedGuest,
            saveSession: (changes) => (savedGuest = { ...savedGuest, ...changes }),
        });
        const authenticated = createAuthenticatedRoomPersistence({
            initialItems: [chair],
            saveItems: async (items) => items.map((item) => ({ ...item, x: 42 })),
        });

        expect(guest.load()).toEqual([chair]);
        expect(authenticated.load()).toEqual([chair]);
        expect(await guest.save([{ ...chair, x: 41 }])).toEqual([{ ...chair, x: 41 }]);
        expect(await authenticated.save([{ ...chair, x: 41 }])).toEqual([{ ...chair, x: 42 }]);
    });
});
