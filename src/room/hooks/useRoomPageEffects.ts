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
    const debouncedSaveRef = useRef<((next: string) => void) | null>(null);

    useEffect(() => {
        const debounced = debounce((next: string) => {
            saveComputer({ shortcuts: authedShortcutsRef.current, cursorColor: next });
        }, 200);

        debouncedSaveRef.current = debounced;

        return () => {
            debouncedSaveRef.current = null;
        };
    }, [authedShortcutsRef, saveComputer]);

    useEffect(() => {
        saveAuthedCursorColorRef.current = (next) => {
            debouncedSaveRef.current?.(next);
        };

        return () => {
            saveAuthedCursorColorRef.current = null;
        };
    }, [saveAuthedCursorColorRef]);
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

        const guestCompleted = initialGuestSession?.onboardingCompleted ?? false;

        if (guestCompleted) {
            reconciledGuestOnboardingRef.current = true;
            completeOnboarding()
                .catch(() => {})
                .finally(() => {
                    clearGuestSession();
                });
        } else {
            clearGuestSession();
        }
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
    const hiddenHeartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        hasVisitorsRef.current = hasVisitors;
    }, [hasVisitors]);

    useEffect(() => {
        latestRoomIdRef.current = roomId;
        sharingActiveRef.current = isSharingActive;
    }, [isSharingActive, roomId]);

    useEffect(() => {
        if (isGuest) return;

        if (!roomId) return;

        if (!currentUserId) return;

        if (!room || room.userId !== currentUserId) return;

        if (!isSharingActive) return;

        let intervalId: ReturnType<typeof setInterval> | null = null;
        let stopped = false;

        const stopHiddenHeartbeats = () => {
            if (hiddenHeartbeatRef.current) {
                clearInterval(hiddenHeartbeatRef.current);
                hiddenHeartbeatRef.current = null;
            }
        };

        const stopHeartbeats = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }

            stopHiddenHeartbeats();
        };

        const sendHeartbeat = () => {
            if (stopped) return;
            heartbeatInvite({ roomId, hasGuests: hasVisitorsRef.current })
                .then((result) => {
                    const closed =
                        typeof result === "object" && result !== null && "closed" in result ? result.closed : false;

                    const reason =
                        typeof result === "object" && result !== null && "reason" in result ? result.reason : undefined;

                    if (closed || reason === "host-only-timeout") {
                        stopHeartbeats();
                    }
                })
                .catch((err) => {
                    console.error("[Room] heartbeatInvite failed", err);
                    const message = err instanceof Error ? err.message : String(err);

                    if (
                        message.includes("host-only-timeout") ||
                        message.includes("invite-missing") ||
                        message.includes("inactive") ||
                        message.includes("Not authenticated") ||
                        message.includes("Forbidden")
                    ) {
                        stopHeartbeats();
                    }
                });
        };

        sendHeartbeat();
        intervalId = setInterval(() => {
            sendHeartbeat();
        }, 120_000);

        const maybeAttachVisibilityListener = () => {
            if (typeof document === "undefined") return null;

            const handleVisibilityChange = () => {
                const hidden = document.visibilityState === "hidden";

                if (hidden) {
                    sendHeartbeat();

                    if (!hiddenHeartbeatRef.current) {
                        hiddenHeartbeatRef.current = setInterval(sendHeartbeat, 60_000);
                    }
                } else {
                    stopHiddenHeartbeats();
                }
            };

            document.addEventListener("visibilitychange", handleVisibilityChange);
            handleVisibilityChange();

            return () => {
                document.removeEventListener("visibilitychange", handleVisibilityChange);
                stopHiddenHeartbeats();
            };
        };

        const detachVisibility = maybeAttachVisibilityListener();

        return () => {
            stopped = true;
            stopHeartbeats();
            detachVisibility?.();
        };
    }, [currentUserId, heartbeatInvite, isGuest, isSharingActive, room, roomId]);

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
