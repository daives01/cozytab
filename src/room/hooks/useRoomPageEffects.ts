import { useEffect, useRef, useState, startTransition } from "react";
import type React from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { Shortcut } from "@shared/guestTypes";
import type { DailyRewardToastPayload } from "../types";
import { debounce } from "@/lib/debounce";

type RoomRecord = Pick<Doc<"rooms">, "_id" | "items" | "userId">;

export function useCursorColorSaver(
    saveComputer: (args: { shortcuts: Shortcut[]; cursorColor: string }) => void,
    authedShortcutsRef: React.MutableRefObject<Shortcut[]>,
    saveAuthedCursorColorRef: React.MutableRefObject<((next: string) => void) | null>,
) {
    useEffect(() => {
        const save = debounce((cursorColor: string) => {
            saveComputer({ shortcuts: authedShortcutsRef.current, cursorColor });
        }, 200);
        saveAuthedCursorColorRef.current = save;

        return () => {
            save.cancel();
            saveAuthedCursorColorRef.current = null;
        };
    }, [authedShortcutsRef, saveAuthedCursorColorRef, saveComputer]);
}

export function useReconcileGuestOnboarding({
    isGuest,
    reconciledGuestOnboardingRef,
    user,
    initialGuestSession,
    completeOnboarding,
    clearGuestSession,
}: {
    isGuest: boolean;
    reconciledGuestOnboardingRef: React.MutableRefObject<boolean>;
    user: Doc<"users"> | null | undefined;
    initialGuestSession: { onboardingCompleted?: boolean } | null;
    completeOnboarding: () => Promise<FunctionReturnType<typeof api.users.completeOnboarding>>;
    clearGuestSession: () => void;
}) {
    useEffect(() => {
        if (isGuest || reconciledGuestOnboardingRef.current || !user) return;

        let active = true;
        let retry: ReturnType<typeof setTimeout>;
        const reconcile = async () => {
            try {
                if (initialGuestSession?.onboardingCompleted) await completeOnboarding();
                if (!active) return;
                reconciledGuestOnboardingRef.current = true;
                clearGuestSession();
            } catch {
                if (active) retry = setTimeout(reconcile, 5_000);
            }
        };
        void reconcile();

        return () => {
            active = false;
            clearTimeout(retry);
        };
    }, [
        clearGuestSession,
        completeOnboarding,
        initialGuestSession?.onboardingCompleted,
        isGuest,
        reconciledGuestOnboardingRef,
        user,
    ]);
}

export function useOwnerPresenceCursorSync({
    isGuest,
    updateCursor,
    screenCursor,
    hasVisitors,
    lastRoomPositionRef,
}: {
    isGuest: boolean;
    updateCursor: (x: number, y: number, clientX: number, clientY: number, hasVisitors: boolean) => void;
    screenCursor: { x: number; y: number };
    hasVisitors: boolean;
    lastRoomPositionRef: React.MutableRefObject<{ x: number; y: number }>;
}) {
    useEffect(() => {
        if (isGuest) return;
        updateCursor(
            lastRoomPositionRef.current.x,
            lastRoomPositionRef.current.y,
            screenCursor.x,
            screenCursor.y,
            hasVisitors,
        );
    }, [hasVisitors, isGuest, screenCursor.x, screenCursor.y, updateCursor, lastRoomPositionRef]);
}

export function useEnsureRoomLoaded({
    room,
    isGuest,
    createRoom,
}: {
    room: RoomRecord | null | undefined;
    isGuest: boolean;
    createRoom: () => void;
}) {
    const createRoomRequestedRef = useRef(false);

    useEffect(() => {
        if (!isGuest) {
            if (room === null) {
                if (!createRoomRequestedRef.current) {
                    createRoomRequestedRef.current = true;
                    createRoom();
                }
            } else if (room) {
                createRoomRequestedRef.current = false;
            }
        }
    }, [room, createRoom, isGuest]);
}

export function useLeaseHeartbeat({
    isGuest,
    room,
    heartbeatInvite,
    closeInviteSession,
    isSharingActive,
    hasVisitors = false,
    currentUserId,
}: {
    isGuest: boolean;
    room: RoomRecord | null | undefined;
    heartbeatInvite: (args: {
        roomId: Id<"rooms">;
        hasGuests?: boolean;
    }) => Promise<FunctionReturnType<typeof api.rooms.heartbeatInvite>>;
    closeInviteSession: (args: {
        roomId: Id<"rooms">;
    }) => Promise<FunctionReturnType<typeof api.rooms.closeInviteSession>>;
    isSharingActive: boolean;
    hasVisitors?: boolean;
    currentUserId?: Id<"users"> | null;
}) {
    const hasVisitorsRef = useRef(hasVisitors);
    const roomId = room?._id ?? null;
    const latestRoomIdRef = useRef<Id<"rooms"> | null>(roomId);
    const sharingActiveRef = useRef(isSharingActive);
    useEffect(() => {
        hasVisitorsRef.current = hasVisitors;
    }, [hasVisitors]);

    useEffect(() => {
        latestRoomIdRef.current = roomId;
        sharingActiveRef.current = isSharingActive;
    }, [isSharingActive, roomId]);

    const ownerId = room?.userId;
    useEffect(() => {
        if (isGuest || !roomId || !currentUserId || ownerId !== currentUserId || !isSharingActive) return;

        // Only idle leases may send; stopped leases cannot be revived by late responses or visibility events.
        let state: "idle" | "pending" | "stopped" = "idle";
        let timer: ReturnType<typeof setInterval>;
        const stop = () => {
            state = "stopped";
            clearInterval(timer);
        };
        const send = async () => {
            if (state !== "idle") return;
            state = "pending";
            try {
                const result = await heartbeatInvite({ roomId, hasGuests: hasVisitorsRef.current });
                if (result.closed || result.expiresAt === null) stop();
            } catch (error) {
                console.error("[Room] heartbeatInvite failed", error);
            } finally {
                if (state === "pending") state = "idle";
            }
        };
        const schedule = () => {
            clearInterval(timer);
            if (state === "stopped") return;
            const hidden = typeof document !== "undefined" && document.visibilityState === "hidden";
            timer = setInterval(() => void send(), hidden ? 60_000 : 120_000);
            if (hidden) void send();
        };

        schedule();
        void send();
        if (typeof document !== "undefined") document.addEventListener("visibilitychange", schedule);

        return () => {
            stop();
            if (typeof document !== "undefined") document.removeEventListener("visibilitychange", schedule);
        };
    }, [currentUserId, heartbeatInvite, isGuest, isSharingActive, ownerId, roomId]);

    // Close invite on unmount (e.g., tab close/navigation) if sharing was active for the latest room.
    useEffect(() => {
        return () => {
            const latestRoomId = latestRoomIdRef.current;

            if (sharingActiveRef.current && latestRoomId) {
                closeInviteSession({ roomId: latestRoomId }).catch(() => {});
            }
        };
    }, [closeInviteSession]);
}

export function useSyncComputerState({
    isGuest,
    computerState,
    setLocalShortcuts,
    setAuthedCursorColor,
    userCursorColor,
}: {
    isGuest: boolean;
    computerState: { shortcuts: Shortcut[]; cursorColor?: string } | null | undefined;
    setLocalShortcuts: (shortcuts: Shortcut[]) => void;
    setAuthedCursorColor: (color: string) => void;
    userCursorColor?: string;
}) {
    useEffect(() => {
        if (isGuest) return;

        if (!computerState) return;
        startTransition(() => {
            setLocalShortcuts(computerState.shortcuts);
            const color = userCursorColor ?? computerState.cursorColor;

            if (color) {
                setAuthedCursorColor(color);
            }
        });
    }, [computerState, isGuest, setAuthedCursorColor, setLocalShortcuts, userCursorColor]);
}

export function useViewportSize() {
    const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>(() => ({
        width: typeof window !== "undefined" ? window.innerWidth : 1280,
        height: typeof window !== "undefined" ? window.innerHeight : 720,
    }));

    useEffect(() => {
        const handleResize = () => {
            setViewportSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };

        handleResize();
        window.addEventListener("resize", handleResize);

        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return viewportSize;
}

export function useDailyRewardToastTimer(
    dailyRewardToast: DailyRewardToastPayload | null,
    setDailyRewardToast: (next: DailyRewardToastPayload | null) => void,
) {
    useEffect(() => {
        if (!dailyRewardToast) return;
        const timer = window.setTimeout(() => setDailyRewardToast(null), 4500);

        return () => window.clearTimeout(timer);
    }, [dailyRewardToast, setDailyRewardToast]);
}

export function useOnboardingAssetPrefetch(
    onboardingActive: boolean,
    resolvedComputerAssetUrl: string | null,
    computerPrefetchedRef: React.MutableRefObject<boolean>,
) {
    useEffect(() => {
        if (!onboardingActive) return;

        if (computerPrefetchedRef.current) return;

        if (!resolvedComputerAssetUrl) return;

        const img = new Image();
        img.src = resolvedComputerAssetUrl;
        computerPrefetchedRef.current = true;
    }, [resolvedComputerAssetUrl, onboardingActive, computerPrefetchedRef]);
}

export function useEscapeToExitEditMode(mode: "view" | "edit", onExit: () => void) {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== "Escape") return;
            const target = event.target instanceof Element ? event.target : null;

            const isTypingTarget =
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.getAttribute("contenteditable") === "true");

            if (isTypingTarget) return;

            if (mode === "edit") {
                event.preventDefault();
                onExit();
            }
        };

        window.addEventListener("keydown", handleKeyDown);

        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [mode, onExit]);
}
