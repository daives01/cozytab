import { describe, expect, test } from "bun:test";
import { ConvexError } from "convex/values";
import type { Id } from "@convex/_generated/dataModel";
import type { GuestSessionState, RoomItem } from "@shared/guestTypes";
import {
    createAuthenticatedRoomPersistence,
    createGuestRoomPersistence,
    createRoomEditingSession,
    type RoomPersistence,
    type RoomSessionScheduler,
} from "@/room/session";
import { createRoomDraft } from "@/room/session/roomDraft";
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

        expect(session.placementEligibility(chairId)).toEqual({ allowed: false, roomAtCapacity: false, ownedCount: 1, placedCount: 1, remaining: 0 });
        expect(session.place({ catalogItemId: chairId, x: 0, y: 0 })).toEqual({ accepted: false, reason: "insufficient-ownership" });
        expect(session.place({ catalogItemId: lampId, x: 0, y: 0 })).toEqual({ accepted: false, reason: "insufficient-ownership" });
        expect(session.getSnapshot().items).toEqual([chair]);
    });

    test("allows the 50th placement, rejects the 51st, and frees capacity on removal", async () => {
        const initial = Array.from({ length: 49 }, (_, index) => ({ ...chair, id: `chair-${index}` }));
        const { adapter, saves } = persistence(initial);
        const session = createRoomEditingSession({
            roomId: "room-1",
            persistence: adapter,
            ownedCount: () => 100,
            createItemId: () => "last-chair",
        });
        session.enterEditMode();
        expect(session.beginPlacement(chairId)).toEqual({ accepted: true });
        expect(session.place({ catalogItemId: chairId, x: 1, y: 2 }).accepted).toBe(true);
        const fullSnapshot = session.getSnapshot();
        expect(fullSnapshot.items).toHaveLength(50);
        expect(session.placementEligibility(lampId)).toMatchObject({ allowed: false, roomAtCapacity: true, remaining: 100 });
        expect(session.beginPlacement(lampId)).toEqual({ accepted: false, reason: "room-full" });
        expect(session.place({ catalogItemId: lampId, x: 1, y: 2 })).toEqual({ accepted: false, reason: "room-full" });
        expect(session.getSnapshot()).toBe(fullSnapshot);
        await session.flush();
        expect(saves[0]).toHaveLength(50);

        session.remove("last-chair");
        expect(session.placementEligibility(lampId)).toMatchObject({ allowed: true, roomAtCapacity: false });
        expect(session.place({ catalogItemId: lampId, x: 1, y: 2 }).accepted).toBe(true);
        await session.flush();
        expect(saves.at(-1)).toHaveLength(50);
        session.dispose();
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

    test("flushes a pending structural edit when the session is disposed", async () => {
        const clock = manualScheduler();
        const { adapter, saves } = persistence([chair]);
        const session = createRoomEditingSession({ roomId: "room-1", persistence: adapter, scheduler: clock.scheduler });
        session.enterEditMode();
        session.move("chair-1", { x: 73, y: 24 });

        session.dispose();
        await Promise.resolve();
        await Promise.resolve();

        expect(clock.size()).toBe(0);
        expect(saves).toHaveLength(1);
        expect(saves[0][0].x).toBe(73);
    });

    test("retains failed drafts and recovers them in a new session", async () => {
        let draft: RoomItem[] | null = null;
        let shouldFail = true;
        const adapter: RoomPersistence = {
            load: () => [chair],
            draft: {
                load: () => draft,
                write: (items) => { draft = items; },
                acknowledge: (items) => { if (JSON.stringify(draft) === JSON.stringify(items)) draft = null; },
            },
            save: async (items) => {
                if (shouldFail) throw new Error("network");
                return items;
            },
        };
        const first = createRoomEditingSession({ roomId: "room-1", persistence: adapter });
        first.enterEditMode();
        first.move("chair-1", { x: 88, y: 20 });
        await first.flush();
        expect(draft?.[0].x).toBe(88);

        shouldFail = false;
        const recovered = createRoomEditingSession({ roomId: "room-1", persistence: adapter });
        expect(recovered.getSnapshot().items[0].x).toBe(88);
        await recovered.flush();
        expect(draft).toBeNull();
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
        expect(session.getSnapshot().saveStatus).toBe("error");
        await session.flush();

        expect(attempts).toBe(2);
        expect(session.getSnapshot().saveStatus).toBe("clean");
    });

    test("preserves failed edits and explicitly retries the latest revision before allowing switches", async () => {
        const retry = deferred<RoomItem[]>();
        const saves: RoomItem[][] = [];
        const clock = manualScheduler();
        const session = createRoomEditingSession({
            roomId: "room-1",
            scheduler: clock.scheduler,
            persistence: {
                load: () => [chair],
                save: async (items) => {
                    saves.push(items);
                    if (saves.length === 1) throw new Error("Reconnect and try again");
                    return retry.promise;
                },
            },
        });
        session.enterEditMode();
        session.move("chair-1", { x: 25, y: 35 });
        await session.flush();
        expect(session.getSnapshot()).toMatchObject({
            saveStatus: "error", saveError: "Reconnect and try again", canSwitchRooms: false,
        });
        expect(session.getSnapshot().items[0]).toMatchObject({ x: 25, y: 35 });
        session.move("chair-1", { x: 50, y: 60 });
        expect(session.getSnapshot().saveError).toBe("Reconnect and try again");
        const pendingRetry = session.retrySave();
        expect(session.getSnapshot().saveStatus).toBe("saving");
        expect(session.getSnapshot().saveError).toBe("Reconnect and try again");
        expect(clock.size()).toBe(0);
        session.exitEditMode();
        expect(session.getSnapshot().canSwitchRooms).toBe(false);
        expect(saves[1][0]).toMatchObject({ x: 50, y: 60 });
        retry.resolve(saves[1]);
        await pendingRetry;
        expect(saves).toHaveLength(2);
        expect(session.getSnapshot()).toMatchObject({ saveStatus: "clean", saveError: null, canSwitchRooms: true });
    });

    test.each([
        ["Convex error", new ConvexError("Sign in again to save your room"), "Sign in again to save your room"],
        ["string", "Reconnect and retry", "Reconnect and retry"],
        ["unknown", null, "Check your connection and try again."],
        ["empty error", new Error(""), "Check your connection and try again."],
    ])("keeps an actionable message for save rejection %s", async (_kind, error, message) => {
        const session = createRoomEditingSession({
            roomId: "room-1",
            persistence: { load: () => [chair], save: async () => { throw error; } },
        });
        session.enterEditMode();
        session.flip("chair-1");
        await session.flush();
        expect(session.getSnapshot()).toMatchObject({ saveStatus: "error", saveError: message });
        await session.retrySave();
        expect(session.getSnapshot()).toMatchObject({ saveStatus: "error", saveError: message });
    });

    test("captures synchronous adapter failures and recovers", async () => {
        let fail = true;
        const session = createRoomEditingSession({
            roomId: "room-1",
            persistence: {
                load: () => [chair],
                save: (items) => {
                    if (fail) throw new Error("Storage unavailable");
                    return Promise.resolve(items);
                },
            },
        });
        session.enterEditMode();
        session.flip(chair.id);
        await session.flush();
        expect(session.getSnapshot()).toMatchObject({ saveStatus: "error", saveError: "Storage unavailable" });
        fail = false;
        await session.retrySave();
        expect(session.getSnapshot()).toMatchObject({ saveStatus: "clean", saveError: null });
    });

    test("retry waits for an older in-flight failure and saves the newest edit", async () => {
        const first = deferred<RoomItem[]>();
        const saves: RoomItem[][] = [];
        const clock = manualScheduler();
        const session = createRoomEditingSession({
            roomId: "room-1", scheduler: clock.scheduler,
            persistence: {
                load: () => [chair],
                save: (items) => {
                    saves.push(items);
                    return saves.length === 1 ? first.promise : Promise.resolve(items);
                },
            },
        });
        session.enterEditMode();
        session.move(chair.id, { x: 30, y: 20 });
        clock.runAll();
        session.move(chair.id, { x: 90, y: 20 });
        const retry = session.retrySave();
        first.reject(new Error("Offline"));
        await retry;
        expect(saves).toHaveLength(2);
        expect(saves[1][0].x).toBe(90);
        expect(clock.size()).toBe(0);
        expect(session.getSnapshot()).toMatchObject({ saveStatus: "clean", saveError: null, canSwitchRooms: false });
        session.exitEditMode();
        expect(session.getSnapshot().canSwitchRooms).toBe(true);
    });

    test("late failures from a disposed room cannot publish into a new session", async () => {
        const pending = deferred<RoomItem[]>();
        const oldSession = createRoomEditingSession({
            roomId: "old-account-room",
            persistence: { load: () => [chair], save: () => pending.promise },
        });
        let notifications = 0;
        oldSession.subscribe(() => notifications++);
        oldSession.enterEditMode();
        oldSession.flip(chair.id);
        const saving = oldSession.flush();
        oldSession.dispose();
        const countAtDisposal = notifications;
        const nextSession = createRoomEditingSession({ roomId: "new-account-room", persistence: persistence([]).adapter });
        pending.reject(new Error("Old account disconnected"));
        await saving;
        expect(notifications).toBe(countAtDisposal);
        expect(nextSession.getSnapshot()).toMatchObject({ items: [], saveStatus: "clean", saveError: null });
        nextSession.dispose();
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
            roomId: "room-1",
            initialItems: [chair],
            saveItems: async (items) => items.map((item) => ({ ...item, x: 42 })),
        });

        expect(guest.load()).toEqual([chair]);
        expect(authenticated.load()).toEqual([chair]);
        expect(await guest.save([{ ...chair, x: 41 }])).toEqual([{ ...chair, x: 41 }]);
        expect(await authenticated.save([{ ...chair, x: 41 }])).toEqual([{ ...chair, x: 42 }]);
    });
});

function memoryStorage() {
    const values = new Map<string, string>();
    return {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => { values.set(key, value); },
    };
}

describe("exit draft recovery", () => {
    test("checkpoints guest edits before debounce or shutdown, including empty rooms", () => {
        let state: GuestSessionState = { coins: 5, inventoryIds: [chairId], roomItems: [chair], shortcuts: [], onboardingCompleted: false, cursorColor: "red" };
        const clock = manualScheduler();
        const adapter = createGuestRoomPersistence({
            loadSession: () => state,
            saveSession: (changes) => (state = { ...state, ...changes }),
        });
        const session = createRoomEditingSession({ roomId: "guest-owner", persistence: adapter, scheduler: clock.scheduler });
        session.enterEditMode();
        session.remove(chair.id);
        expect(clock.size()).toBe(1);
        expect(state.roomItems).toEqual([]);
        expect(createRoomEditingSession({ roomId: "guest-owner", persistence: adapter }).getSnapshot().items).toEqual([]);
        session.dispose();
    });

    test("guest cleanup does not recreate progress cleared by Guest Conversion", async () => {
        let state: GuestSessionState = { coins: 5, inventoryIds: [chairId], roomItems: [chair], shortcuts: [], onboardingCompleted: false, cursorColor: "red" };
        const session = createRoomEditingSession({ roomId: "guest-owner", persistence: createGuestRoomPersistence({
            loadSession: () => state,
            saveSession: (changes) => (state = { ...state, ...changes }),
        }) });
        session.enterEditMode();
        session.move(chair.id, { x: 80, y: 20 });
        expect(state.roomItems[0].x).toBe(80);
        state = { ...state, roomItems: [] };
        session.dispose();
        await session.flush();
        expect(state.roomItems).toEqual([]);
    });

    test("shutdown needs no network completion to recover an authenticated edit", async () => {
        const storage = memoryStorage();
        const draft = createRoomDraft("room-1", storage);
        const clock = manualScheduler();
        const pending = deferred<RoomItem[]>();
        const session = createRoomEditingSession({ roomId: "room-1", scheduler: clock.scheduler, persistence: {
            load: () => [chair], draft, save: () => pending.promise,
        } });
        session.enterEditMode();
        session.move(chair.id, { x: 99, y: 20 });
        expect(createRoomDraft("room-2", storage).load()).toBeNull();
        const recovered = createRoomEditingSession({ roomId: "room-1", persistence: {
            load: () => [chair], draft: createRoomDraft("room-1", storage), save: async (items) => items,
        } });
        expect(recovered.getSnapshot().items[0].x).toBe(99);
        expect(recovered.getSnapshot().saveStatus).toBe("unsaved");
        // Starting the lifecycle retries recovery, without waiting for another edit.
        const cleanup = createRoomSessionLifecycle(recovered)();
        await recovered.flush();
        expect(draft.load()).toBeNull();
        session.dispose();
        pending.resolve(session.getSnapshot().items);
        cleanup();
    });

    test.each([false, true])("disposal drains the newest revision after an older in-flight save (failure: %s)", async (failFirst) => {
        const storage = memoryStorage();
        const draft = createRoomDraft("room-1", storage);
        const first = deferred<RoomItem[]>();
        const second = deferred<RoomItem[]>();
        const saves: RoomItem[][] = [];
        const session = createRoomEditingSession({ roomId: "room-1", persistence: {
            load: () => [chair], draft,
            save: (items) => { saves.push(items); return saves.length === 1 ? first.promise : second.promise; },
        } });
        session.enterEditMode();
        session.move(chair.id, { x: 30, y: 20 });
        const saving = session.flush();
        session.move(chair.id, { x: 90, y: 20 });
        session.dispose();
        if (failFirst) first.reject(new Error("offline"));
        else first.resolve(saves[0]);
        await saving;
        expect(saves).toHaveLength(2);
        expect(saves[1][0].x).toBe(90);
        expect(draft.load()?.[0].x).toBe(90);
        second.reject(new Error("offline"));
        await second.promise.catch(() => {});
        // Let the session settle without triggering an explicit retry.
        await Promise.resolve();
        await Promise.resolve();
        expect(saves).toHaveLength(2);
        expect(draft.load()?.[0].x).toBe(90);
    });

    test.each([false, true])("detached sessions cannot drain over newer edits (new save completed: %s)", async (completeNewSave) => {
        const storage = memoryStorage();
        const first = deferred<RoomItem[]>();
        const newerSave = deferred<RoomItem[]>();
        const oldSaves: RoomItem[][] = [];
        const old = createRoomEditingSession({ roomId: "room-1", persistence: {
            load: () => [chair], draft: createRoomDraft("room-1", storage),
            save: (items) => { oldSaves.push(items); return first.promise; },
        } });
        old.enterEditMode();
        old.move(chair.id, { x: 30, y: 20 });
        const oldFlush = old.flush();
        old.move(chair.id, { x: 60, y: 20 });
        old.dispose();

        const newer = createRoomEditingSession({ roomId: "room-1", persistence: {
            load: () => [chair], draft: createRoomDraft("room-1", storage),
            save: () => newerSave.promise,
        } });
        newer.enterEditMode();
        newer.move(chair.id, { x: 90, y: 20 });
        const newFlush = newer.flush();
        if (completeNewSave) {
            newerSave.resolve(newer.getSnapshot().items);
            await newFlush;
        }
        first.resolve(oldSaves[0]);
        await oldFlush;
        // Await detached drain without explicitly retrying either session.
        await Promise.resolve();
        expect(oldSaves).toHaveLength(1);
        expect(newer.getSnapshot().items[0].x).toBe(90);
        newerSave.resolve(newer.getSnapshot().items);
        await newFlush;
        expect(createRoomDraft("room-1", storage).load()).toBeNull();
        newer.dispose();
    });

    test("storage denial still permits a navigation save", async () => {
        const saves: RoomItem[][] = [];
        const session = createRoomEditingSession({ roomId: "room-1", persistence: {
            load: () => [chair],
            draft: createRoomDraft("room-1", {
                getItem: () => { throw new Error("denied"); },
                setItem: () => { throw new Error("denied"); },
            }),
            save: async (items) => { saves.push(items); return items; },
        } });
        session.enterEditMode();
        session.move(chair.id, { x: 90, y: 20 });
        session.dispose();
        await session.flush();
        expect(saves).toHaveLength(1);
        expect(saves[0][0].x).toBe(90);
    });

    test("older acknowledgements cannot erase a newer session's draft", () => {
        const storage = memoryStorage();
        const old = createRoomDraft("room-1", storage);
        old.write([chair]);
        const newer = createRoomDraft("room-1", storage);
        newer.write([{ ...chair, x: 100 }]);
        old.acknowledge([chair]);
        expect(newer.load()?.[0].x).toBe(100);
        newer.acknowledge([{ ...chair, x: 100 }]);
        expect(newer.load()).toBeNull();
    });

    test("storage denial and malformed data do not break normal persistence", () => {
        const denied = createRoomDraft("room-1", {
            getItem: () => { throw new Error("denied"); },
            setItem: () => { throw new Error("quota"); },
        });
        expect(denied.load()).toBeNull();
        expect(() => denied.write([chair])).not.toThrow();
        const storage = memoryStorage();
        storage.setItem("cozytab_room_drafts_v1", '{"room-1":{"updatedAt":9999999999999,"items":[null]}}');
        expect(createRoomDraft("room-1", storage).load()).toBeNull();
    });

    test("bounds stored drafts and ignores expired recovery data", () => {
        const storage = memoryStorage();
        for (let index = 0; index < 12; index++) createRoomDraft(`room-${index}`, storage).write([chair]);
        expect(Object.keys(JSON.parse(storage.getItem("cozytab_room_drafts_v1")!))).toHaveLength(10);
        storage.setItem("cozytab_room_drafts_v1", JSON.stringify({ "room-1": { updatedAt: 0, items: [chair] } }));
        expect(createRoomDraft("room-1", storage).load()).toBeNull();
    });
});
