import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState, useMemo, type DragEvent, useRef, useCallback } from "react";
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
import { useUser } from "@clerk/clerk-react";
import { debounce } from "@/lib/debounce";
import type React from "react";
import { RoomCanvas } from "./RoomCanvas";
import { useResolvedBackgroundUrl } from "./hooks/useResolvedBackgroundUrl";
import { useRoomScale } from "./hooks/useRoomScale";
import { useCozyCursor } from "./hooks/useCozyCursor";
import { ROOM_HEIGHT, ROOM_WIDTH } from "./roomConstants";
import { isMusicItem } from "./roomUtils";
import { canSave, canShare, canUseComputer } from "./utils/sessionGuards";
import { RoomToolbar } from "./RoomToolbar";
import { EditDrawer } from "./EditDrawer";
import { ComputerOverlay } from "./ComputerOverlay";
import {
    clearGuestSession,
    readGuestSession,
    saveGuestSession,
} from "./guestSession";
import { STARTER_COMPUTER_NAME } from "../../shared/guestTypes";
import { GUEST_STARTING_COINS, type GuestShortcut } from "../../shared/guestTypes";

type Mode = "view" | "edit";

const NORMALIZE_COLUMNS = 6;
const MOBILE_MAX_WIDTH = 640;

function normalizeGuestShortcuts(shortcuts: GuestShortcut[]): ComputerShortcut[] {
    return shortcuts.map((shortcut, index) => {
        const row =
            typeof shortcut.row === "number" && !Number.isNaN(shortcut.row)
                ? shortcut.row
                : Math.floor(index / NORMALIZE_COLUMNS);
        const col =
            typeof shortcut.col === "number" && !Number.isNaN(shortcut.col)
                ? shortcut.col
                : index % NORMALIZE_COLUMNS;

        return {
            id: shortcut.id,
            name: shortcut.name,
            url: shortcut.url,
            row,
            col,
        };
    });
}

interface RoomPageProps {
    isGuest?: boolean;
}

export function RoomPage({ isGuest = false }: RoomPageProps) {
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
    const computerState = useQuery(api.users.getMyComputer, isGuest ? "skip" : {});
    const saveComputer = useMutation(api.users.saveMyComputer);
    const claimDailyReward = useMutation(api.users.claimDailyReward);
    const backgroundUrl = useResolvedBackgroundUrl(
        isGuest ? guestTemplate?.backgroundUrl : room?.template?.backgroundUrl
    );
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

    const initialGuestSession = useMemo(() => (isGuest ? readGuestSession() : null), [isGuest]);

    const [mode, setMode] = useState<Mode>("view");
    const [localItems, setLocalItems] = useState<RoomItem[]>(() => initialGuestSession?.roomItems ?? []);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const scale = useRoomScale(ROOM_WIDTH, ROOM_HEIGHT);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [isComputerOpen, setIsComputerOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [localShortcuts, setLocalShortcuts] = useState<ComputerShortcut[]>(() =>
        normalizeGuestShortcuts(initialGuestSession?.shortcuts ?? [])
    );
    const [musicPlayerItemId, setMusicPlayerItemId] = useState<string | null>(null);
    const [guestSessionLoaded, setGuestSessionLoaded] = useState(false);
    const [guestOnboardingCompleted, setGuestOnboardingCompleted] = useState<boolean>(
        () => initialGuestSession?.onboardingCompleted ?? false
    );
    const [guestCoins, setGuestCoins] = useState<number>(() => initialGuestSession?.coins ?? GUEST_STARTING_COINS);
    const [guestInventory, setGuestInventory] = useState<string[]>(() => initialGuestSession?.inventoryIds ?? []);
    const [viewportWidth, setViewportWidth] = useState<number>(() =>
        typeof window !== "undefined" ? window.innerWidth : MOBILE_MAX_WIDTH + 1
    );
    const containerRef = useRef<HTMLDivElement>(null);
    const lastRoomPositionRef = useRef<{ x: number; y: number }>({
        x: ROOM_WIDTH / 2,
        y: ROOM_HEIGHT / 2,
    });
    const computerPrefetchedRef = useRef(false);
    const completeOnboarding = useMutation(api.users.completeOnboarding);
    useCozyCursor(true);

    const markGuestOnboardingComplete = useCallback(() => {
        setGuestOnboardingCompleted(true);
        saveGuestSession({ onboardingCompleted: true });
    }, []);

    const updateGuestCoins = useCallback(
        (next: number | ((prev: number) => number)) => {
            setGuestCoins((prev) => {
                const value = typeof next === "function" ? (next as (p: number) => number)(prev) : next;
                const session = saveGuestSession({ coins: value });
                return session.coins;
            });
        },
        []
    );

    const updateGuestInventory = useCallback((updater: (prev: string[]) => string[]) => {
        setGuestInventory((prev) => {
            const next = updater(prev);
            saveGuestSession({ inventoryIds: next });
            return next;
        });
    }, []);

    const updateGuestShortcuts = useCallback(
        (next: ComputerShortcut[]) => {
            setLocalShortcuts(next);
            if (isGuest) {
                saveGuestSession({ shortcuts: next });
            }
        },
        [isGuest]
    );

    const handleMusicToggle = useCallback(
        (itemId: string, playing: boolean) => {
            const now = Date.now();
            setLocalItems((prev) => {
                const next = prev.map((item) =>
                    item.id === itemId
                        ? {
                            ...item,
                            musicPlaying: playing,
                            musicStartedAt: playing ? now : undefined,
                            musicPositionAtStart: playing ? 0 : undefined,
                        }
                        : item
                );

                if (isGuest) {
                    saveGuestSession({ roomItems: next });
                }

                return next;
            });

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
        [isGuest, room, updateMusicState]
    );

    /* eslint-disable react-hooks/set-state-in-effect */
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

        setGuestSessionLoaded(true);
    }, [guestSessionLoaded, guestRoom, guestTemplate, initialGuestSession, isGuest]);
    /* eslint-enable react-hooks/set-state-in-effect */

    useEffect(() => {
        if (!isGuest || !guestSessionLoaded) return;
        saveGuestSession({ roomItems: localItems });
    }, [isGuest, guestSessionLoaded, localItems]);

    const guestDrawerItems = useMemo(() => {
        if (!catalogItems) return undefined;
        const uniqueInventoryIds = Array.from(
            new Set<string>([...guestInventory, STARTER_COMPUTER_NAME])
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
    }, [catalogItems, guestInventory]);

    const reconciledGuestOnboarding = useRef(false);
    useEffect(() => {
        if (isGuest || reconciledGuestOnboarding.current || !user) return;

        const guestCompleted = readGuestSession().onboardingCompleted;

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
    }, [completeOnboarding, isGuest, user]);

    const visitorId = clerkUser?.id ?? null;
    const ownerName = user?.displayName ?? user?.username ?? "Me";
    // Only track presence when room is shared (has active invite)
    const { visitors, updateCursor, updateChatMessage, screenCursor, localChatMessage } = useWebSocketPresence(
        !isGuest && room && visitorId && isRoomShared ? room._id : null,
        visitorId ?? "",
        ownerName,
        true
    );
    const visitorCount = visitors.filter((v) => !v.isOwner).length;
    const hasVisitors = visitorCount > 0;

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
                    // eslint-disable-next-line react-hooks/set-state-in-effect
                    setLocalItems(room.items as RoomItem[]);
                }
            }
        }
    }, [room, createRoom, isGuest, mode, localItems.length]);

    useEffect(() => {
        if (isGuest) return;
        if (!computerState) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setLocalShortcuts(computerState.shortcuts as ComputerShortcut[]);
    }, [computerState, isGuest]);

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

    useDailyReward({
        user,
        isGuest,
        claimDailyReward,
    });

    const { onboardingStep, onboardingActive, advanceOnboarding, handleOnboardingComplete } = useOnboarding({
        user,
        isGuest,
        completeOnboarding,
        guestOnboardingCompleted,
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
    }, [advanceOnboarding, mode, onboardingStep]);

    const handleDrawerToggle = useCallback(() => {
        setIsDrawerOpen(!isDrawerOpen);
    }, [isDrawerOpen]);

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

        setLocalItems((prev) => [...prev, newItem]);

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

    if (!isGuest && !room) {
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
                        setLocalItems((prev) =>
                            prev.map((i) => (i.id === newItem.id ? newItem : i))
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
                    setLocalItems((prev) => prev.filter((item) => item.id !== itemId));
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
                        saveComputer({ shortcuts });
                    }
                }}
                userCurrency={user?.currency ?? guestCoins ?? 0}
                lastDailyReward={user?.lastDailyReward}
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
                guestCoins={guestCoins}
                onGuestCoinsChange={(coins) => updateGuestCoins(coins)}
                startingCoins={GUEST_STARTING_COINS}
                guestInventory={guestInventory}
                onGuestPurchase={(itemId) => {
                    updateGuestInventory((prev) => {
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
            />

            {musicPlayerItemId && (() => {
                const item = localItems.find((i) => i.id === musicPlayerItemId);
                return item ? (
                    <MusicPlayerModal
                        item={item}
                        onClose={() => setMusicPlayerItemId(null)}
                        onSave={(updatedItem) => {
                            const updatedItems = localItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
                            setLocalItems(updatedItems);
                            if (isGuest) {
                                saveGuestSession({ roomItems: updatedItems });
                            } else if (room) {
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
