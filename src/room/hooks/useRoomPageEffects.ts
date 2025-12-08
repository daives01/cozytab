import { useEffect, useRef, useState, startTransition, useCallback } from "react";
import type React from "react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import type { RoomItem, ComputerShortcut } from "../../types";
import type { DailyRewardToastPayload } from "../types/dailyReward";
import { debounce } from "../../lib/debounce";

type RoomRecord = Pick<Doc<"rooms">, "_id" | "items">;

export function useCursorColorSaver(
    saveComputer: (args: { shortcuts: ComputerShortcut[]; cursorColor: string }) => void,
    authedShortcutsRef: React.MutableRefObject<ComputerShortcut[]>,
    saveAuthedCursorColorRef: React.MutableRefObject<((next: string) => void) | null>
) {
    const debouncedSaveRef = useRef<((next: string) => void) | null>(null);

    useEffect(() => {
        const debounced = debounce((next: string) => {
            saveComputer({ shortcuts: authedShortcutsRef.current, cursorColor: next });
        }, 200);

        debouncedSaveRef.current = debounced;

        return () => {
            if (typeof (debounced as { cancel?: () => void }).cancel === "function") {
                (debounced as { cancel?: () => void }).cancel?.();
            }
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

export function useGuestBootstrap({
    isGuest,
    guestSessionLoadedRef,
    initialGuestSession,
    guestRoomItems,
    guestTemplateItems,
    setLocalItems,
}: {
    isGuest: boolean;
    guestSessionLoadedRef: React.MutableRefObject<boolean>;
    initialGuestSession: { roomItems: RoomItem[] } | null;
    guestRoomItems: RoomItem[] | undefined;
    guestTemplateItems: RoomItem[] | undefined;
    setLocalItems: (updater: (prev: RoomItem[]) => RoomItem[]) => void;
}) {
    useEffect(() => {
        if (!isGuest || guestSessionLoadedRef.current) return;

        const session = initialGuestSession ?? { roomItems: [] };

        if (session.roomItems.length > 0) {
            setLocalItems(() => session.roomItems as RoomItem[]);
        } else if (guestRoomItems?.length) {
            setLocalItems(() => guestRoomItems as RoomItem[]);
        } else {
            if (guestTemplateItems && guestTemplateItems.length > 0) {
                setLocalItems(() => guestTemplateItems as RoomItem[]);
            }
        }

        guestSessionLoadedRef.current = true;
    }, [guestRoomItems, guestTemplateItems, guestSessionLoadedRef, initialGuestSession, isGuest, setLocalItems]);
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
    completeOnboarding: () => Promise<unknown>;
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
    }, [clearGuestSession, completeOnboarding, initialGuestSession?.onboardingCompleted, isGuest, reconciledGuestOnboardingRef, user]);
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
            hasVisitors
        );
    }, [hasVisitors, isGuest, screenCursor.x, screenCursor.y, updateCursor, lastRoomPositionRef]);
}

export function useDebouncedRoomSave({
    isGuest,
    mode,
    room,
    localItems,
    saveRoom,
}: {
    isGuest: boolean;
    mode: "view" | "edit";
    room: RoomRecord | null | undefined;
    localItems: RoomItem[];
    saveRoom: (args: { roomId: Id<"rooms">; items: RoomItem[] }) => void;
}) {
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastSavedSerializedRef = useRef<string>("");
    const prevModeRef = useRef<typeof mode>(mode);

    const saveNow = useCallback(
        (roomId: Id<"rooms">, items: RoomItem[]) => {
            const serialized = JSON.stringify(items);
            if (serialized === lastSavedSerializedRef.current) return;
            saveRoom({ roomId, items });
            lastSavedSerializedRef.current = serialized;
        },
        [saveRoom]
    );

    useEffect(() => {
        if (!canSave(isGuest)) return;
        if (!room || mode !== "edit") {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
            return;
        }

        const roomId = room._id;
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        saveTimeoutRef.current = setTimeout(() => {
            saveNow(roomId, localItems);
            saveTimeoutRef.current = null;
        }, 400);

        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
                saveTimeoutRef.current = null;
            }
        };
    }, [isGuest, localItems, mode, room, saveNow]);

    useEffect(() => {
        if (!canSave(isGuest)) {
            prevModeRef.current = mode;
            return;
        }
        if (!room) {
            prevModeRef.current = mode;
            return;
        }

        const prevMode = prevModeRef.current;
        if (prevMode === "edit" && mode === "view") {
            saveNow(room._id, localItems);
        }
        prevModeRef.current = mode;
    }, [isGuest, localItems, mode, room, saveNow]);
}

function canSave(isGuest: boolean) {
    return !isGuest;
}

export function useEnsureRoomLoaded({
    room,
    isGuest,
    setLocalItems,
    createRoom,
}: {
    room: RoomRecord | null | undefined;
    isGuest: boolean;
    setLocalItems: (items: RoomItem[]) => void;
    createRoom: () => void;
}) {
    const hasHydratedRef = useRef(false);
    const lastRoomIdRef = useRef<Id<"rooms"> | null>(null);

    useEffect(() => {
        if (!isGuest) {
            if (room === null) {
                createRoom();
            } else if (room) {
                const roomId = room._id;
                const isNewRoom = roomId !== lastRoomIdRef.current;
                if (!hasHydratedRef.current || isNewRoom) {
                    setLocalItems(room.items as RoomItem[]);
                    hasHydratedRef.current = true;
                    lastRoomIdRef.current = roomId;
                }
            }
        }
    }, [room, createRoom, isGuest, setLocalItems]);
}

export function useLeaseHeartbeat({
    isGuest,
    room,
    renewLease,
    hasVisitors = false,
}: {
    isGuest: boolean;
    room: RoomRecord | null | undefined;
    renewLease: (args: { roomId: Id<"rooms">; hasGuests?: boolean }) => Promise<unknown>;
    hasVisitors?: boolean;
}) {
    useEffect(() => {
        if (isGuest) return;
        if (!room) return;

        let intervalId: ReturnType<typeof setInterval> | null = null;

        const stopHeartbeats = () => {
            if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
            }
        };

        const sendHeartbeat = () => {
            renewLease({ roomId: room._id, hasGuests: hasVisitors })
                .then((result: { closed?: boolean; reason?: string } | unknown) => {
                    const closed = typeof result === "object" && result !== null && "closed" in result
                        ? (result as { closed?: boolean }).closed
                        : false;
                    const reason = typeof result === "object" && result !== null && "reason" in result
                        ? (result as { reason?: string }).reason
                        : undefined;
                    if (closed || reason === "host-only-timeout") {
                        stopHeartbeats();
                    }
                })
                .catch((err) => {
                    console.error("[Room] renewLease failed", err);
                    const message = err instanceof Error ? err.message : String(err);
                    if (
                        message.includes("host-only-timeout") ||
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

        return () => {
            stopHeartbeats();
        };
    }, [hasVisitors, isGuest, renewLease, room]);
}

export function useSyncComputerState({
    isGuest,
    computerState,
    setLocalShortcuts,
    setAuthedCursorColor,
    userCursorColor,
}: {
    isGuest: boolean;
    computerState: { shortcuts: ComputerShortcut[]; cursorColor?: string } | null | undefined;
    setLocalShortcuts: (shortcuts: ComputerShortcut[]) => void;
    setAuthedCursorColor: (color: string) => void;
    userCursorColor?: string;
}) {
    useEffect(() => {
        if (isGuest) return;
        if (!computerState) return;
        startTransition(() => {
            setLocalShortcuts(computerState.shortcuts);
            const color = computerState.cursorColor || userCursorColor;
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
    setDailyRewardToast: (next: DailyRewardToastPayload | null) => void
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
    computerPrefetchedRef: React.MutableRefObject<boolean>
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
