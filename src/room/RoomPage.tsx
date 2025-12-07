import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState, useMemo, type DragEvent, useRef, useCallback } from "react";
import { useAtomValue, useSetAtom, useAtom } from "jotai";
import type { RoomItem, ComputerShortcut } from "../types";
import { ItemNode } from "./ItemNode";
import { MusicPlayerModal } from "./MusicPlayerModal";
import { MusicPlayerButtons } from "./MusicPlayerButtons";
import { ShareModal } from "./ShareModal";
import { PresenceCursor } from "./PresenceCursor";
import { LocalCursor } from "./LocalCursor";
import { useWebSocketPresence } from "../hooks/useWebSocketPresence";
import { ChatInput } from "./ChatInput";
import { Onboarding } from "./Onboarding";
import { useOnboarding } from "./hooks/useOnboarding";
import { useDailyReward } from "./hooks/useDailyReward";
import { DailyRewardToast } from "./components/DailyRewardToast";
import type { DailyRewardToastPayload } from "./types/dailyReward";
import { useUser } from "@clerk/clerk-react";
import { debounce } from "@/lib/debounce";
import type React from "react";
import { RoomCanvas } from "./RoomCanvas";
import { useResolvedBackgroundUrl } from "./hooks/useResolvedBackgroundUrl";
import { useRoomScale } from "./hooks/useRoomScale";
import { useCozyCursor } from "./hooks/useCozyCursor";
import { useCursorColor } from "./hooks/useCursorColor";
import { ROOM_HEIGHT, ROOM_WIDTH } from "./roomConstants";
import { isMusicItem } from "./roomUtils";
import { canSave, canShare, canUseComputer } from "./utils/sessionGuards";
import { RoomToolbar } from "./RoomToolbar";
import { EditDrawer } from "./EditDrawer";
import { ComputerOverlay } from "./ComputerOverlay";
import {
    clearGuestSession,
    readGuestSession,
} from "./guestSession";
import { STARTER_COMPUTER_NAME } from "../../shared/guestTypes";
import { GUEST_STARTING_COINS, type GuestSessionState } from "../../shared/guestTypes";
import {
    guestCoinsAtom,
    guestComputerOpenAtom,
    guestDisplayNameAtom,
    guestDrawerOpenAtom,
    guestDraggedItemIdAtom,
    guestInventoryAtom,
    guestModeAtom,
    guestMusicPlayerItemIdAtom,
    guestRoomItemsAtom,
    guestSelectedItemIdAtom,
    guestShortcutsAtom,
    guestOnboardingCompletedAtom,
    guestShareModalOpenAtom,
    guestNormalizedShortcutsAtom,
    normalizeGuestShortcuts,
    guestCursorColorAtom,
} from "./guestState";

type Mode = "view" | "edit";

const MOBILE_MAX_WIDTH = 640;

interface RoomPageProps {
    isGuest?: boolean;
    guestSession?: GuestSessionState;
}

export function RoomPage({ isGuest = false, guestSession }: RoomPageProps) {
    const room = useQuery(api.rooms.getMyActiveRoom, isGuest ? "skip" : {});
    const guestTemplate = useQuery(api.roomTemplates.getDefault, isGuest ? {} : "skip");
    const guestRoom = useQuery(api.rooms.getDefaultRoom, isGuest ? {} : "skip");
    const user = useQuery(api.users.getMe, isGuest ? "skip" : {});
    const activeInvites = useQuery(api.invites.getMyActiveInvites, isGuest ? "skip" : {});
    const catalogItems = useQuery(api.catalog.list, isGuest ? {} : "skip");
    const { user: clerkUser } = useUser();
    const createRoom = useMutation(api.rooms.createRoom);
    const saveRoom = useMutation(api.rooms.saveMyRoom);
    const updateMusicState = useMutation(api.rooms.updateMusicState);
    const renewLease = useMutation(api.rooms.renewLease);
    const computerState = useQuery(api.users.getMyComputer, isGuest ? "skip" : {});
    const saveComputer = useMutation(api.users.saveMyComputer);
    const claimDailyReward = useMutation(api.users.claimDailyReward);
    const backgroundSource = useMemo(() => {
        if (isGuest) return guestTemplate?.backgroundUrl;
        if (room?.template?.backgroundUrl) return room.template.backgroundUrl;
        return guestTemplate?.backgroundUrl ?? guestRoom?.template?.backgroundUrl;
    }, [guestRoom?.template?.backgroundUrl, guestTemplate?.backgroundUrl, isGuest, room?.template?.backgroundUrl]);

    const backgroundUrl = useResolvedBackgroundUrl(backgroundSource);
    const computerCatalogItem = useMemo(() => {
        if (!catalogItems) return null;
        return catalogItems.find((c) => c.name === STARTER_COMPUTER_NAME) ?? null;
    }, [catalogItems]);
    const computerStorageId = useMemo(() => {
        if (!computerCatalogItem?.assetUrl?.startsWith("storage:")) return null;
        return computerCatalogItem.assetUrl.replace("storage:", "");
    }, [computerCatalogItem]);
    const computerResolvedUrl = useQuery(
        api.catalog.getImageUrl,
        computerStorageId ? { storageId: computerStorageId as Id<"_storage"> } : "skip"
    );
    const resolvedComputerAssetUrl = useMemo(() => {
        const assetUrl = computerCatalogItem?.assetUrl;
        if (!assetUrl) return null;
        if (assetUrl.startsWith("storage:")) return computerResolvedUrl ?? null;
        return assetUrl;
    }, [computerCatalogItem?.assetUrl, computerResolvedUrl]);

    // Only enable presence when room is shared (has active invite)
    const isRoomShared = useMemo(() => (activeInvites?.length ?? 0) > 0, [activeInvites]);

    const initialGuestSession = useMemo(() => {
        if (guestSession) return guestSession;
        if (isGuest) return readGuestSession();
        return null;
    }, [guestSession, isGuest]);

    const [localDisplayName, setLocalDisplayName] = useState<string | null>(null);

    const [authedMode, setAuthedMode] = useState<Mode>("view");
    const [authedItems, setAuthedItems] = useState<RoomItem[]>(() => initialGuestSession?.roomItems ?? []);
    const [authedSelectedId, setAuthedSelectedId] = useState<string | null>(null);
    const [authedDrawerOpen, setAuthedDrawerOpen] = useState(false);
    const scale = useRoomScale(ROOM_WIDTH, ROOM_HEIGHT);
    const [authedDraggedItemId, setAuthedDraggedItemId] = useState<string | null>(null);
    const [authedComputerOpen, setAuthedComputerOpen] = useState(false);
    const [authedShareModalOpen, setAuthedShareModalOpen] = useState(false);
    const [authedShortcuts, setAuthedShortcuts] = useState<ComputerShortcut[]>(() =>
        normalizeGuestShortcuts(initialGuestSession?.shortcuts ?? [])
    );
    const authedShortcutsRef = useRef<ComputerShortcut[]>(normalizeGuestShortcuts(initialGuestSession?.shortcuts ?? []));
    const [authedCursorColor, setAuthedCursorColor] = useState<string | null>(initialGuestSession?.cursorColor ?? null);
    const saveAuthedCursorColorRef = useRef<((next: string) => void) | null>(null);
    const [authedMusicPlayerItemId, setAuthedMusicPlayerItemId] = useState<string | null>(null);
    const [musicAutoplay, setMusicAutoplay] = useState<{ itemId: string; token: string } | null>(null);
    const [dailyRewardToast, setDailyRewardToast] = useState<DailyRewardToastPayload | null>(null);
    const [guestSessionLoaded, setGuestSessionLoaded] = useState(false);
    const [guestOnboardingCompletedState, setGuestOnboardingCompletedState] = useState<boolean>(
        () => initialGuestSession?.onboardingCompleted ?? false
    );
    const [guestCoinsState, setGuestCoinsState] = useState<number>(() => initialGuestSession?.coins ?? GUEST_STARTING_COINS);
    const [guestInventoryState, setGuestInventoryState] = useState<string[]>(() => initialGuestSession?.inventoryIds ?? []);
    const [viewportWidth, setViewportWidth] = useState<number>(() =>
        typeof window !== "undefined" ? window.innerWidth : MOBILE_MAX_WIDTH + 1
    );

    useEffect(() => {
        authedShortcutsRef.current = authedShortcuts;
    }, [authedShortcuts]);

    // Guest atoms (only used when isGuest=true; provider scopes store)
    const [guestRoomItems, setGuestRoomItems] = useAtom(guestRoomItemsAtom);
    const guestCoins = useAtomValue(guestCoinsAtom);
    const setGuestCoins = useSetAtom(guestCoinsAtom);
    const guestInventory = useAtomValue(guestInventoryAtom);
    const setGuestInventory = useSetAtom(guestInventoryAtom);
    const guestShortcuts = useAtomValue(guestNormalizedShortcutsAtom);
    const setGuestShortcuts = useSetAtom(guestShortcutsAtom);
    const guestMode = useAtomValue(guestModeAtom);
    const setGuestMode = useSetAtom(guestModeAtom);
    const guestDrawerOpen = useAtomValue(guestDrawerOpenAtom);
    const setGuestDrawerOpen = useSetAtom(guestDrawerOpenAtom);
    const guestSelectedId = useAtomValue(guestSelectedItemIdAtom);
    const setGuestSelectedId = useSetAtom(guestSelectedItemIdAtom);
    const guestDraggedItemId = useAtomValue(guestDraggedItemIdAtom);
    const setGuestDraggedItemId = useSetAtom(guestDraggedItemIdAtom);
    const guestComputerOpen = useAtomValue(guestComputerOpenAtom);
    const setGuestComputerOpen = useSetAtom(guestComputerOpenAtom);
    const guestShareModalOpen = useAtomValue(guestShareModalOpenAtom);
    const setGuestShareModalOpen = useSetAtom(guestShareModalOpenAtom);
    const guestMusicPlayerItemId = useAtomValue(guestMusicPlayerItemIdAtom);
    const setGuestMusicPlayerItemId = useSetAtom(guestMusicPlayerItemIdAtom);
    const guestDisplayName = useAtomValue(guestDisplayNameAtom);
    const setGuestDisplayName = useSetAtom(guestDisplayNameAtom);
    const guestOnboardingCompleted = useAtomValue(guestOnboardingCompletedAtom);
    const setGuestOnboardingCompleted = useSetAtom(guestOnboardingCompletedAtom);
    const guestCursorColor = useAtomValue(guestCursorColorAtom);
    const setGuestCursorColor = useSetAtom(guestCursorColorAtom);

    const mode = isGuest ? guestMode : authedMode;
    const setMode = isGuest ? setGuestMode : setAuthedMode;
    const localItems = isGuest ? guestRoomItems : authedItems;
    const setLocalItems = isGuest ? setGuestRoomItems : setAuthedItems;
    const selectedId = isGuest ? guestSelectedId : authedSelectedId;
    const setSelectedId = isGuest ? setGuestSelectedId : setAuthedSelectedId;
    const isDrawerOpen = isGuest ? guestDrawerOpen : authedDrawerOpen;
    const setIsDrawerOpen = isGuest ? setGuestDrawerOpen : setAuthedDrawerOpen;
    const draggedItemId = isGuest ? guestDraggedItemId : authedDraggedItemId;
    const setDraggedItemId = isGuest ? setGuestDraggedItemId : setAuthedDraggedItemId;
    const isComputerOpen = isGuest ? guestComputerOpen : authedComputerOpen;
    const setIsComputerOpen = isGuest ? setGuestComputerOpen : setAuthedComputerOpen;
    const isShareModalOpen = isGuest ? guestShareModalOpen : authedShareModalOpen;
    const setIsShareModalOpen = isGuest ? setGuestShareModalOpen : setAuthedShareModalOpen;
    const localShortcuts: ComputerShortcut[] = isGuest ? guestShortcuts : authedShortcuts;
    const setLocalShortcuts = useCallback(
        (next: ComputerShortcut[]) => {
            if (isGuest) {
                setGuestShortcuts(next);
            } else {
                setAuthedShortcuts(next);
            }
        },
        [isGuest, setAuthedShortcuts, setGuestShortcuts]
    );
    const musicPlayerItemId = isGuest ? guestMusicPlayerItemId : authedMusicPlayerItemId;
    const setMusicPlayerItemId = isGuest ? setGuestMusicPlayerItemId : setAuthedMusicPlayerItemId;
    const guestOnboardingCompletedValue = isGuest ? guestOnboardingCompleted : guestOnboardingCompletedState;
    const setGuestOnboardingCompletedValue = isGuest
        ? setGuestOnboardingCompleted
        : setGuestOnboardingCompletedState;
    const guestCoinsValue = isGuest ? guestCoins : guestCoinsState;
    const setGuestCoinsValue = isGuest ? setGuestCoins : setGuestCoinsState;
    const guestInventoryValue = isGuest ? guestInventory : guestInventoryState;
    const setGuestInventoryValue = isGuest ? setGuestInventory : setGuestInventoryState;
    const displayNameValue = isGuest ? guestDisplayName : localDisplayName;
    const setDisplayNameValue = isGuest ? setGuestDisplayName : setLocalDisplayName;
    const containerRef = useRef<HTMLDivElement>(null);
    const lastRoomPositionRef = useRef<{ x: number; y: number }>({
        x: ROOM_WIDTH / 2,
        y: ROOM_HEIGHT / 2,
    });
    const computerPrefetchedRef = useRef(false);
    const completeOnboarding = useMutation(api.users.completeOnboarding);
    useCozyCursor(true);
    const cursorColor =
        (isGuest
            ? guestCursorColor
            : authedCursorColor ?? computerState?.cursorColor ?? user?.cursorColor) ?? "#6366f1";
    useCursorColor(cursorColor);

    const computedDisplayName = useMemo(
        () => displayNameValue ?? user?.displayName ?? user?.username ?? clerkUser?.username ?? "You",
        [clerkUser?.username, displayNameValue, user?.displayName, user?.username]
    );

    const computedUsername = useMemo(
        () => user?.username ?? clerkUser?.username ?? "you",
        [clerkUser?.username, user?.username]
    );

    const markGuestOnboardingComplete = useCallback(() => {
        setGuestOnboardingCompletedValue(true);
    }, [setGuestOnboardingCompletedValue]);

    const updateGuestCoins = useCallback(
        (next: number | ((prev: number) => number)) => {
            setGuestCoinsValue(next);
        },
        [setGuestCoinsValue]
    );

    const updateGuestInventory = useCallback((updater: (prev: string[]) => string[]) => {
        setGuestInventoryValue(updater);
    }, [setGuestInventoryValue]);

    const updateGuestShortcuts = useCallback(
        (next: ComputerShortcut[]) => {
            setLocalShortcuts(next);
        },
        [setLocalShortcuts]
    );

    const handleMusicToggle = useCallback(
        (itemId: string, playing: boolean) => {
            const now = Date.now();
            setLocalItems((prev: RoomItem[]) =>
                prev.map((item: RoomItem) =>
                    item.id === itemId
                        ? {
                            ...item,
                            musicPlaying: playing,
                            musicStartedAt: playing ? now : undefined,
                            musicPositionAtStart: playing ? 0 : undefined,
                        }
                        : item
                )
            );

            if (!isGuest && room) {
                updateMusicState({
                    roomId: room._id,
                    itemId,
                    musicPlaying: playing,
                    musicStartedAt: playing ? now : 0,
                    musicPositionAtStart: 0,
                });
            }
        },
        [isGuest, room, setLocalItems, updateMusicState]
    );

    useEffect(() => {
        saveAuthedCursorColorRef.current = debounce((next: string) => {
            saveComputer({ shortcuts: authedShortcutsRef.current, cursorColor: next });
        }, 500);
    }, [saveComputer]);

    const handleCursorColorChange = useCallback(
        (next: string) => {
            const color = next?.trim();
            if (!color) return;
            if (isGuest) {
                setGuestCursorColor(color);
            } else {
                setAuthedCursorColor(color);
                saveAuthedCursorColorRef.current?.(color);
            }
        },
        [isGuest, setAuthedCursorColor, setGuestCursorColor]
    );

    useEffect(() => {
        if (!isGuest || guestSessionLoaded) return;

        const session = initialGuestSession ?? readGuestSession();

        if (session.roomItems.length > 0) {
            setLocalItems(session.roomItems as RoomItem[]);
        } else if (guestRoom?.items) {
            setLocalItems(guestRoom.items as RoomItem[]);
        } else {
            const templateItems = (guestTemplate as unknown as { items?: RoomItem[] } | undefined)?.items;
            if (templateItems && templateItems.length > 0) {
                setLocalItems(templateItems as RoomItem[]);
            }
        }

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setGuestSessionLoaded(true);
    }, [guestSessionLoaded, guestRoom, guestTemplate, initialGuestSession, isGuest, setLocalItems]);

    const guestDrawerItems = useMemo(() => {
        if (!catalogItems) return undefined;
        const uniqueInventoryIds = Array.from(
            new Set<string>([...guestInventoryValue, STARTER_COMPUTER_NAME])
        );

        return uniqueInventoryIds
            .map((id) => catalogItems.find((c) => c._id === id || c.name === id))
            .filter((item): item is (typeof catalogItems)[number] => Boolean(item))
            .map((item) => ({
                inventoryId: `guest-${item._id ?? item.name ?? STARTER_COMPUTER_NAME}`,
                catalogItemId: item.name ?? STARTER_COMPUTER_NAME,
                name: item.name ?? STARTER_COMPUTER_NAME,
                assetUrl: item.assetUrl,
                category: item.category,
                hidden: false,
            }));
    }, [catalogItems, guestInventoryValue]);

    const reconciledGuestOnboarding = useRef(false);
    useEffect(() => {
        if (isGuest || reconciledGuestOnboarding.current || !user) return;

        const guestCompleted =
            initialGuestSession?.onboardingCompleted ?? readGuestSession().onboardingCompleted;

        if (guestCompleted) {
            reconciledGuestOnboarding.current = true;
            completeOnboarding()
                .catch(() => {})
                .finally(() => {
                    clearGuestSession();
                });
        } else {
            clearGuestSession();
        }
    }, [completeOnboarding, initialGuestSession?.onboardingCompleted, isGuest, user]);

    const visitorId = clerkUser?.id ?? null;
    const ownerName = user?.displayName ?? user?.username ?? "Me";
    // Only track presence when room is shared (has active invite)
    const { visitors, updateCursor, updateChatMessage, screenCursor, localChatMessage } = useWebSocketPresence(
        !isGuest && room && visitorId && isRoomShared ? room._id : null,
        visitorId ?? "",
        ownerName,
        true,
        cursorColor
    );
    const visitorCount = visitors.filter((v) => !v.isOwner).length;
    const hasVisitors = visitorCount > 0;

    useEffect(() => {
        if (isGuest) return;
        updateCursor(
            lastRoomPositionRef.current.x,
            lastRoomPositionRef.current.y,
            screenCursor.x,
            screenCursor.y
        );
    }, [cursorColor, isGuest, screenCursor.x, screenCursor.y, updateCursor]);

    const debouncedSaveRef = useRef<((roomId: Id<"rooms">, items: RoomItem[]) => void) | null>(null);

    useEffect(() => {
        debouncedSaveRef.current = debounce((roomId: Id<"rooms">, items: RoomItem[]) => {
            saveRoom({ roomId, items });
        }, 1000);
    }, [saveRoom]);

    useEffect(() => {
        if (!isGuest) {
            if (room === null) {
                createRoom({});
            } else if (room) {
                if (mode === "view" || localItems.length === 0) {
                    setLocalItems(room.items as RoomItem[]);
                }
            }
        }
    }, [room, createRoom, isGuest, mode, localItems.length, setLocalItems]);

    useEffect(() => {
        if (isGuest) return;
        if (!room) return;

        let cancelled = false;

        const sendHeartbeat = () => {
            renewLease({ roomId: room._id }).catch((err) => {
                console.error("[Room] renewLease failed", err);
            });
        };

        sendHeartbeat();

        const intervalId = setInterval(() => {
            if (cancelled) return;
            sendHeartbeat();
        }, 60_000);

        return () => {
            cancelled = true;
            clearInterval(intervalId);
        };
    }, [isGuest, renewLease, room]);

    useEffect(() => {
        if (isGuest) return;
        if (!computerState) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocalShortcuts(computerState.shortcuts as ComputerShortcut[]);
        if (computerState.cursorColor) {
            setAuthedCursorColor(computerState.cursorColor);
        } else if (user?.cursorColor) {
            setAuthedCursorColor(user.cursorColor);
        }
    }, [computerState, isGuest, setAuthedCursorColor, setLocalShortcuts, user?.cursorColor]);

    useEffect(() => {
        const handleResize = () => {
            setViewportWidth(window.innerWidth);
        };

        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (!canSave(isGuest)) return;
        if (mode === "edit" && room && debouncedSaveRef.current) {
            debouncedSaveRef.current(room._id, localItems);
        }
    }, [isGuest, localItems, mode, room]);

    const dailyRewardInfo = useDailyReward({
        user,
        isGuest,
        claimDailyReward,
        onReward: ({ awardedAt, loginStreak }) => {
            setDailyRewardToast({
                awardedAt,
                loginStreak,
            });
        },
    });

    const effectiveLoginStreak =
        dailyRewardInfo.loginStreak ?? (user as { loginStreak?: number } | null | undefined)?.loginStreak ?? null;
    const effectiveNextRewardAt =
        dailyRewardInfo.nextRewardAt ??
        (user as { nextRewardAt?: number | null } | null | undefined)?.nextRewardAt ??
        null;

    useEffect(() => {
        if (!dailyRewardToast) return;
        const timer = window.setTimeout(() => setDailyRewardToast(null), 4500);
        return () => window.clearTimeout(timer);
    }, [dailyRewardToast]);

    const { onboardingStep, onboardingActive, advanceOnboarding, handleOnboardingComplete } = useOnboarding({
        user,
        isGuest,
        completeOnboarding,
        guestOnboardingCompleted: guestOnboardingCompletedValue,
        markGuestOnboardingComplete,
    });

    useEffect(() => {
        if (!onboardingActive) return;
        if (computerPrefetchedRef.current) return;
        if (!resolvedComputerAssetUrl) return;

        const img = new Image();
        img.src = resolvedComputerAssetUrl;
        computerPrefetchedRef.current = true;
    }, [resolvedComputerAssetUrl, onboardingActive]);

    const handleModeToggle = useCallback(() => {
        if (mode === "edit") {
            setMode("view");
            setIsDrawerOpen(false);
            if (onboardingStep === "switch-to-view") {
                advanceOnboarding();
            }
        } else {
            setMode("edit");
            setIsDrawerOpen(true);
            if (onboardingStep === "enter-edit-mode") {
                advanceOnboarding();
            }
        }
    }, [advanceOnboarding, mode, onboardingStep, setIsDrawerOpen, setMode]);

    const handleDrawerToggle = useCallback(() => {
        setIsDrawerOpen((prev) => !prev);
    }, [setIsDrawerOpen]);

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
    };

    const updateCursorFromClient = useCallback(
        (clientX: number, clientY: number) => {
            const rect = containerRef.current?.getBoundingClientRect();

            if (rect) {
                const roomX = (clientX - rect.left) / scale;
                const roomY = (clientY - rect.top) / scale;
                const clampedX = Math.max(0, Math.min(ROOM_WIDTH, roomX));
                const clampedY = Math.max(0, Math.min(ROOM_HEIGHT, roomY));
                lastRoomPositionRef.current = { x: clampedX, y: clampedY };
                updateCursor(clampedX, clampedY, clientX, clientY);
            } else {
                const { x, y } = lastRoomPositionRef.current;
                updateCursor(x, y, clientX, clientY);
            }
        },
        [scale, updateCursor]
    );

    const handleMouseEvent = (e: React.MouseEvent) => {
        updateCursorFromClient(e.clientX, e.clientY);
    };

    const handleDrop = (e: DragEvent) => {
        e.preventDefault();
        if (mode !== "edit") return;

        const catalogItemId = e.dataTransfer.getData("catalogItemId");
        if (!catalogItemId) return;

        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();

        const relativeX = e.clientX - rect.left;
        const relativeY = e.clientY - rect.top;

        const x = relativeX / scale;
        const y = relativeY / scale;

        const newItem: RoomItem = {
            id: crypto.randomUUID(),
            catalogItemId: catalogItemId,
            x: x,
            y: y,
            flipped: false,
        };

        setLocalItems((prev: RoomItem[]) => [...prev, newItem]);

        if (onboardingStep === "place-computer") {
            advanceOnboarding();
        }
    };

    const isTooNarrow = viewportWidth <= MOBILE_MAX_WIDTH;

    if (isTooNarrow) {
        return (
            <div className="min-h-screen min-w-screen bg-[var(--paper,#f5f2e9)] text-[var(--ink,#111827)] flex items-center justify-center p-6 font-['Patrick_Hand']">
                <div className="max-w-md w-full bg-white border-4 border-[var(--ink,#111827)] rounded-2xl shadow-[4px_4px_0px_0px_rgba(31,41,55,0.65)] p-6 rotate-1 text-center space-y-3">
                    <div className="text-2xl">Desktop only (for now)</div>
                    <p className="text-lg leading-relaxed">
                        Cozytab needs a bit more room. Please visit on a desktop or widen your browser to continue.
                    </p>
                </div>
            </div>
        );
    }

    const showGuestFallback = (room === undefined || room === null) && Boolean(initialGuestSession);

    if (!isGuest && !room && !showGuestFallback) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading your cozytab...
            </div>
        );
    }

    if (isGuest && guestTemplate === undefined && guestRoom === undefined) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading cozytab...
            </div>
        );
    }

    if (isGuest && guestTemplate === null && guestRoom === null) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                No demo room found.
            </div>
        );
    }

    const shouldHighlightMusicPurchase = onboardingStep === "buy-item";

    const shareAllowed = canShare(isGuest);
    const computerGuard = canUseComputer(isGuest);

    const roomContent = (
        <>
            {localItems.map((item) => (
                <ItemNode
                    key={item.id}
                    item={item}
                    isSelected={item.id === selectedId}
                    mode={mode}
                    scale={scale}
                    onSelect={() => {
                        setSelectedId(item.id);
                    }}
                    onChange={(newItem) => {
                        setLocalItems((prev: RoomItem[]) =>
                            prev.map((i: RoomItem) => (i.id === newItem.id ? newItem : i))
                        );
                    }}
                    onDragStart={() => setDraggedItemId(item.id)}
                    onDragEnd={() => setDraggedItemId(null)}
                    onComputerClick={() => {
                        if (mode !== "view") return;
                        if (!computerGuard.allowOpen) return;
                        setIsComputerOpen(true);
                        if (onboardingStep === "click-computer") {
                            advanceOnboarding();
                        }
                    }}
                    onMusicPlayerClick={() => {
                        if (mode === "view") {
                            setMusicPlayerItemId(item.id);
                        }
                    }}
                    isOnboardingComputerTarget={onboardingStep === "click-computer"}
                    overlay={
                        isMusicItem(item) ? (
                            <MusicPlayerButtons
                                key={`music-${item.id}-${item.musicUrl ?? "none"}`}
                                item={item}
                                onToggle={(playing) => handleMusicToggle(item.id, playing)}
                                autoPlayToken={musicAutoplay?.itemId === item.id ? musicAutoplay.token : null}
                            />
                        ) : null
                    }
                />
            ))}

            {!isGuest && visitorId && visitors
                .filter((v) => v.visitorId !== visitorId)
                .map((visitor) => (
                    <PresenceCursor
                        key={visitor.visitorId}
                        name={visitor.displayName}
                        isOwner={visitor.isOwner}
                        x={visitor.x}
                        y={visitor.y}
                        chatMessage={visitor.chatMessage}
                        scale={scale}
                        cursorColor={visitor.cursorColor}
                    />
                ))}
        </>
    );

    const overlays = (
        <>
            <RoomToolbar
                isGuest={isGuest}
                mode={mode}
                onToggleMode={handleModeToggle}
                shareAllowed={shareAllowed}
                visitorCount={visitorCount}
                onShareClick={() => setIsShareModalOpen(true)}
            />

            <EditDrawer
                mode={mode}
                isDrawerOpen={isDrawerOpen}
                onDrawerToggle={handleDrawerToggle}
                draggedItemId={draggedItemId}
                onDeleteItem={(itemId) => {
                    setLocalItems((prev: RoomItem[]) => prev.filter((item: RoomItem) => item.id !== itemId));
                    setSelectedId((current) => (current === itemId ? null : current));
                }}
                highlightComputer={onboardingStep === "place-computer"}
                isGuest={isGuest}
                guestItems={guestDrawerItems}
            />

            <ComputerOverlay
                isGuest={isGuest}
                isComputerOpen={isComputerOpen}
                onCloseComputer={() => setIsComputerOpen(false)}
                shortcuts={localShortcuts}
                onUpdateShortcuts={(shortcuts) => {
                    if (isGuest) {
                        updateGuestShortcuts(shortcuts);
                    } else {
                        setLocalShortcuts(shortcuts);
                        saveComputer({ shortcuts, cursorColor });
                    }
                }}
                userCurrency={user?.currency ?? guestCoinsValue ?? 0}
                nextRewardAt={effectiveNextRewardAt ?? undefined}
                loginStreak={effectiveLoginStreak ?? undefined}
                onShopOpened={() => {
                    if (onboardingStep === "open-shop") {
                        advanceOnboarding();
                    }
                }}
                onOnboardingPurchase={() => {
                    if (onboardingStep === "buy-item") {
                        advanceOnboarding();
                    }
                }}
                isOnboardingShopStep={onboardingStep === "open-shop"}
                onPointerMove={updateCursorFromClient}
                guestCoins={guestCoinsValue}
                onGuestCoinsChange={(coins) => updateGuestCoins(coins)}
                startingCoins={GUEST_STARTING_COINS}
                guestInventory={guestInventoryValue}
                onGuestPurchase={(itemId) => {
                    updateGuestInventory((prev: string[]) => {
                        if (prev.includes(itemId)) return prev;
                        return [...prev, itemId];
                    });
                }}
                onOnboardingShortcutAdded={() => {
                    if (onboardingStep === "add-shortcut") {
                        advanceOnboarding();
                    }
                }}
                highlightFirstMusicItem={shouldHighlightMusicPurchase}
                displayName={isGuest ? undefined : computedDisplayName}
                username={isGuest ? undefined : computedUsername}
                onDisplayNameUpdated={(next) => setDisplayNameValue(next)}
                cursorColor={cursorColor}
                onCursorColorChange={handleCursorColorChange}
            />

            {musicPlayerItemId && (() => {
                const item = localItems.find((i) => i.id === musicPlayerItemId);
                return item ? (
                    <MusicPlayerModal
                        item={item}
                        onClose={() => setMusicPlayerItemId(null)}
                        onSave={(updatedItem) => {
                            const startedAt = updatedItem.musicStartedAt ?? Date.now();
                            const updatedItems = localItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
                            setLocalItems(updatedItems);

                            if (updatedItem.musicUrl) {
                                setMusicAutoplay({ itemId: updatedItem.id, token: `${updatedItem.id}-${Date.now()}` });
                            }

                            if (!isGuest && room && updatedItem.musicPlaying) {
                                updateMusicState({
                                    roomId: room._id,
                                    itemId: updatedItem.id,
                                    musicPlaying: true,
                                    musicStartedAt: startedAt,
                                    musicPositionAtStart: updatedItem.musicPositionAtStart ?? 0,
                                });
                            }

                            if (!isGuest && room) {
                                saveRoom({ roomId: room._id, items: updatedItems });
                            }
                            setMusicPlayerItemId(null);
                        }}
                    />
                ) : null;
            })()}

            {!isGuest && isShareModalOpen && (
                <ShareModal
                    onClose={() => setIsShareModalOpen(false)}
                    visitorCount={visitorCount}
                />
            )}

            {onboardingActive && onboardingStep && (
                <Onboarding
                    currentStep={onboardingStep}
                    onComplete={handleOnboardingComplete}
                    onNext={advanceOnboarding}
                    onSkip={handleOnboardingComplete}
                    isGuest={isGuest}
                />
            )}

            {!isGuest && dailyRewardToast && <DailyRewardToast toast={dailyRewardToast} />}

            {!isGuest && hasVisitors && (
                <ChatInput
                    onMessageChange={updateChatMessage}
                    disabled={isComputerOpen || musicPlayerItemId !== null || isShareModalOpen}
                />
            )}

            {!isGuest && hasVisitors && !isComputerOpen && !musicPlayerItemId && !isShareModalOpen && (
                <div className="absolute bottom-4 left-4 z-50 pointer-events-none">
                    <div className="bg-[var(--ink)]/80 text-white text-sm px-3 py-1.5 rounded-lg backdrop-blur-sm border-2 border-[var(--ink)] shadow-sm">
                        <span className="font-mono bg-[var(--ink-light)] px-1.5 py-0.5 rounded text-xs mr-1.5">/</span>
                        <span style={{ fontFamily: "'Patrick Hand', cursive" }}>to chat</span>
                    </div>
                </div>
            )}

            <LocalCursor
                x={screenCursor.x}
                y={screenCursor.y}
                chatMessage={!isGuest && hasVisitors ? localChatMessage : null}
                cursorColor={cursorColor}
            />
        </>
    );

    return (
        <RoomCanvas
            backgroundUrl={backgroundUrl}
            scale={scale}
            containerRef={containerRef}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onMouseMove={handleMouseEvent}
            onMouseEnter={handleMouseEvent}
            onBackgroundClick={() => setSelectedId(null)}
            outerClassName={draggedItemId ? "select-none" : ""}
            roomContent={roomContent}
            overlays={overlays}
        />
    );
}
