import { stubGlobal } from "./stubGlobal";
import { createConvexTest, seedUser, seedTemplate, seedRoom } from "./convexTestUtils";
import { afterAll, expect, test } from "bun:test";
import { act, create } from "react-test-renderer";
import { useLeaseHeartbeat, useReconcileGuestOnboarding } from "@/room/hooks/useRoomPageEffects";

const fixtureDb = createConvexTest();
const fixtureUserId = await seedUser(fixtureDb, "fixture");
const fixtureUser = await fixtureDb.run((ctx) => ctx.db.get(fixtureUserId));

if (!fixtureUser) throw new Error("Missing inserted user");

const fixtureTemplate = await seedTemplate(fixtureDb);

const originalActEnvironment = Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT");

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterAll(() => {
    if (originalActEnvironment) Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", originalActEnvironment);
    else Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

test("onboarding retains failed guest data and retries reconciliation", async () => {
    for (const failed of [false, true]) {
        let settle = () => {};
        let cleared = 0;
        const reconciled = { current: false };

        const complete = () =>
            new Promise<{ success: boolean }>((resolve, reject) => {
                settle = () => (failed ? reject(new Error("offline")) : resolve({ success: true }));
            });

        function Harness() {
            useReconcileGuestOnboarding({
                isGuest: false,
                reconciledGuestOnboardingRef: reconciled,
                user: fixtureUser,
                initialGuestSession: { onboardingCompleted: true },
                completeOnboarding: complete,
                clearGuestSession: () => {
                    cleared++;
                },
            });

            return null;
        }

        let renderer: ReturnType<typeof create>;
        await act(() => {
            renderer = create(<Harness />);
        });
        expect(cleared).toBe(0);
        expect(reconciled.current).toBe(false);
        await act(async () => {
            settle();
        });
        expect(cleared).toBe(failed ? 0 : 1);
        expect(reconciled.current).toBe(!failed);
        if (failed) {
            await act(() => renderer.update(<Harness />));
            expect(reconciled.current).toBe(false);
        }
        await act(() => renderer.unmount());
    }
});

test("closed and timeout heartbeat responses stop timers and unmount closes the room", async () => {
    for (const result of [
        { closed: false as const, expiresAt: null, reason: "invite-missing" as const },
        { closed: true as const, expiresAt: 0 },
        { closed: true as const, reason: "host-only-timeout" as const, expiresAt: 0 },
    ]) {
        const timers = new Map<number, () => void>();
        let next = 0;

        const interval = stubGlobal("setInterval", (callback) => {
            if (typeof callback !== "function") throw new Error("Heartbeat must schedule a function");
            timers.set(++next, () => callback());

            // SAFETY: The intercepted interval and clearInterval share this numeric-key map; no native timer consumes this handle.
            return next as ReturnType<typeof setInterval>;
        });

        const clear = stubGlobal("clearInterval", (id) => {
            timers.delete(Number(id));
        });

        const visibility = Object.assign(new EventTarget(), { visibilityState: "hidden" });
        // SAFETY: The hook only reads visibilityState and uses EventTarget listener methods.
        const restoreDocument = stubGlobal("document", visibility as Document);
        let beats = 0;
        let closes = 0;

        const room = {
            _id: await seedRoom(fixtureDb, fixtureUser._id, fixtureTemplate),
            userId: fixtureUser._id,
            items: [],
        };

        function Harness() {
            useLeaseHeartbeat({
                isGuest: false,
                room,
                currentUserId: room.userId,
                isSharingActive: true,
                heartbeatInvite: async () => {
                    beats++;

                    return result;
                },
                closeInviteSession: async () => {
                    closes++;

                    return { closed: true, expiresAt: 0 };
                },
            });

            return null;
        }

        try {
            let renderer: ReturnType<typeof create>;
            await act(async () => {
                renderer = create(<Harness />);
            });
            expect(beats).toBe(1);
            expect(timers.size).toBe(0);
            visibility.dispatchEvent(new Event("visibilitychange"));
            expect(timers.size).toBe(0);
            expect(beats).toBe(1);
            await act(() => renderer.unmount());
            expect(closes).toBe(1);
            expect(timers.size).toBe(0);
        } finally {
            restoreDocument();
            interval();
            clear();
        }
    }
});

test("failed onboarding retries and clears only on recovery", async () => {
    let retry = () => {};
    const nativeTimeout = globalThis.setTimeout;
    const restore = stubGlobal("setTimeout", (callback, delay, ...args) => {
        if (delay !== 5_000) return nativeTimeout(callback, delay, ...args);
        if (typeof callback !== "function") throw new Error("Expected retry callback");
        retry = () => callback();
        return nativeTimeout(() => {}, 100_000);
    });
    let attempts = 0;
    let clears = 0;
    const reconciled = { current: false };
    const complete = async () => {
        if (++attempts === 1) throw new Error("offline");
        return { success: true };
    };
    const clear = () => {
        clears++;
    };
    function Harness() {
        useReconcileGuestOnboarding({
            isGuest: false,
            reconciledGuestOnboardingRef: reconciled,
            user: fixtureUser,
            initialGuestSession: { onboardingCompleted: true },
            completeOnboarding: complete,
            clearGuestSession: clear,
        });
        return null;
    }
    let renderer: ReturnType<typeof create>;
    try {
        await act(async () => {
            renderer = create(<Harness />);
        });
        expect(clears).toBe(0);
        expect(reconciled.current).toBe(false);
        await act(async () => {
            retry();
        });
        expect(attempts).toBe(2);
        expect(clears).toBe(1);
        expect(reconciled.current).toBe(true);
        await act(() => renderer.unmount());
    } finally {
        restore();
    }
});

test("heartbeat deduplicates pending calls, retries failures, and ignores late completion after cleanup", async () => {
    let tick = () => {};
    let scheduled = false;
    const restoreInterval = stubGlobal("setInterval", (callback) => {
        if (typeof callback !== "function") throw new Error("Expected heartbeat callback");
        tick = () => callback();
        scheduled = true;
        // SAFETY: clearInterval is intercepted alongside this synthetic handle.
        return 1 as ReturnType<typeof setInterval>;
    });
    const restoreClear = stubGlobal("clearInterval", () => {
        scheduled = false;
    });
    let rejectBeat = (_error: Error) => {};
    let resolveBeat = (_result: { closed: false; expiresAt: number }) => {};
    let beats = 0;
    const heartbeat = () => {
        beats++;
        return new Promise<{ closed: false; expiresAt: number }>((resolve, reject) => {
            resolveBeat = resolve;
            rejectBeat = reject;
        });
    };
    const room = {
        _id: await seedRoom(fixtureDb, fixtureUser._id, fixtureTemplate),
        userId: fixtureUser._id,
        items: [],
    };
    const close = async () => ({ closed: true as const, expiresAt: 0 });
    function Harness() {
        useLeaseHeartbeat({
            isGuest: false,
            room,
            currentUserId: room.userId,
            isSharingActive: true,
            heartbeatInvite: heartbeat,
            closeInviteSession: close,
        });
        return null;
    }
    let renderer: ReturnType<typeof create>;
    try {
        await act(async () => {
            renderer = create(<Harness />);
        });
        tick();
        tick();
        expect(beats).toBe(1);
        await act(async () => {
            rejectBeat(new Error("offline"));
        });
        expect(scheduled).toBe(true);
        tick();
        expect(beats).toBe(2);
        await act(() => renderer.unmount());
        expect(scheduled).toBe(false);
        await act(async () => {
            resolveBeat({ closed: false, expiresAt: 100 });
        });
        tick();
        expect(beats).toBe(2);
        expect(scheduled).toBe(false);
    } finally {
        restoreInterval();
        restoreClear();
    }
});
