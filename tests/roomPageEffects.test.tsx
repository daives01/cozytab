import { expect, test, spyOn } from "bun:test";
import { act, create } from "react-test-renderer";
import { useLeaseHeartbeat, useReconcileGuestOnboarding } from "@/room/hooks/useRoomPageEffects";
import type { Doc, Id } from "@convex/_generated/dataModel";

test("onboarding clears guest data only after successful or failed settlement", async () => {
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
                user: { _id: "user" } as Doc<"users">,
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
        expect(reconciled.current).toBe(true);
        await act(async () => {
            settle();
        });
        expect(cleared).toBe(1);
        await act(() => renderer.unmount());
    }
});

test("closed and timeout heartbeat responses stop timers and unmount closes the room", async () => {
    for (const result of [
        { closed: true as const, expiresAt: 0 },
        { closed: true as const, reason: "host-only-timeout" as const, expiresAt: 0 },
    ]) {
        const timers = new Map<number, () => void>();
        let next = 0;
        const interval = spyOn(globalThis, "setInterval").mockImplementation((callback) => {
            timers.set(++next, callback as () => void);
            return next as ReturnType<typeof setInterval>;
        });
        const clear = spyOn(globalThis, "clearInterval").mockImplementation((id) => {
            timers.delete(Number(id));
        });
        let beats = 0;
        let closes = 0;
        const room = { _id: "room" as Id<"rooms">, userId: "user" as Id<"users">, items: [] };
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
            await act(() => renderer.unmount());
            expect(closes).toBe(1);
            expect(timers.size).toBe(0);
        } finally {
            interval.mockRestore();
            clear.mockRestore();
        }
    }
});
