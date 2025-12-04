import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useEffect, useState, useMemo, type DragEvent, useRef } from "react";
import type { RoomItem, Shortcut } from "../types";
import { ItemNode } from "./ItemNode";
import { AssetDrawer } from "./AssetDrawer";
import { TrashCan } from "./TrashCan";
import { ComputerScreen } from "./ComputerScreen";
import { MusicPlayerModal } from "./MusicPlayerModal";
import { MusicPlayerButtons } from "./MusicPlayerButtons";
import { Shop } from "./Shop";
import { ShareModal } from "./ShareModal";
import { PresenceCursor } from "./PresenceCursor";
import { LocalCursor } from "./LocalCursor";
import { usePresence } from "../hooks/usePresence";
import { ChatInput } from "./ChatInput";
import { Onboarding } from "./Onboarding";
import { useOnboarding } from "./hooks/useOnboarding";
import { useDailyReward } from "./hooks/useDailyReward";
import { Button } from "@/components/ui/button";
import { SignInButton, useUser } from "@clerk/clerk-react";
import { Lock, LockOpen, LogIn, ChevronLeft, ChevronRight, Gift, Share2 } from "lucide-react";
import { debounce } from "@/lib/debounce";
import type React from "react";

// Hook to resolve storage URLs for background images
function useResolvedBackgroundUrl(backgroundUrl: string | undefined) {
    const isStorageUrl = backgroundUrl?.startsWith("storage:");
    const storageId = isStorageUrl ? backgroundUrl?.replace("storage:", "") : null;
    const resolvedUrl = useQuery(
        api.catalog.getImageUrl,
        storageId ? { storageId: storageId as Id<"_storage"> } : "skip"
    );
    
    if (!backgroundUrl) return "/src/assets/house.png"; // fallback
    if (isStorageUrl) return resolvedUrl ?? undefined;
    return backgroundUrl;
}

type Mode = "view" | "edit";

interface RoomPageProps {
    isGuest?: boolean;
}

const ROOM_WIDTH = 1920;
const ROOM_HEIGHT = 1080;

export function RoomPage({ isGuest = false }: RoomPageProps) {
    const room = useQuery(api.rooms.getMyActiveRoom, isGuest ? "skip" : {});
    const user = useQuery(api.users.getMe, isGuest ? "skip" : {});
    const activeInvites = useQuery(api.invites.getMyActiveInvites, isGuest ? "skip" : {});
    const { user: clerkUser } = useUser();
    const createRoom = useMutation(api.rooms.createRoom);
    const saveRoom = useMutation(api.rooms.saveMyRoom);
    const saveShortcuts = useMutation(api.rooms.saveShortcuts);
    const claimDailyReward = useMutation(api.users.claimDailyReward);
    const backgroundUrl = useResolvedBackgroundUrl(room?.template?.backgroundUrl);
    
    // Only enable presence when room is shared (has active invite)
    const isRoomShared = useMemo(() => (activeInvites?.length ?? 0) > 0, [activeInvites]);

    const [mode, setMode] = useState<Mode>("view");
    const [localItems, setLocalItems] = useState<RoomItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [scale, setScale] = useState(1);
    const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
    const [isComputerOpen, setIsComputerOpen] = useState(false);
    const [isShopOpen, setIsShopOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [localShortcuts, setLocalShortcuts] = useState<Shortcut[]>([]);
    const [musicPlayerItemId, setMusicPlayerItemId] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const completeOnboarding = useMutation(api.users.completeOnboarding);

    const visitorId = clerkUser?.id ?? null;
    const ownerName = user?.displayName ?? user?.username ?? "Me";
    // Only track presence when room is shared (has active invite)
    const { visitors, updateCursor, updateChatMessage, screenCursor, localChatMessage } = usePresence(
        !isGuest && room && visitorId && isRoomShared ? room._id : null,
        visitorId ?? "",
        ownerName,
        true
    );
    const visitorCount = visitors.filter((v) => !v.isOwner).length;
    const hasVisitors = visitorCount > 0;

    useEffect(() => {
        const handleResize = () => {
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            const scaleX = windowWidth / ROOM_WIDTH;
            const scaleY = windowHeight / ROOM_HEIGHT;

            const newScale = Math.max(scaleX, scaleY);
            setScale(newScale);
        };

        window.addEventListener("resize", handleResize);
        handleResize();

        return () => window.removeEventListener("resize", handleResize);
    }, []);

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
                if (room.shortcuts) {
                    setLocalShortcuts(room.shortcuts as Shortcut[]);
                } else {
                    setLocalShortcuts([]);
                }
            }
        }
    }, [room, createRoom, isGuest, mode, localItems.length]);

    useEffect(() => {
        if (mode === "edit" && room && debouncedSaveRef.current) {
            debouncedSaveRef.current(room._id, localItems);
        }
    }, [localItems, mode, room]);

    const { showRewardNotification, setShowRewardNotification } = useDailyReward({
        user,
        isGuest,
        claimDailyReward,
    });

    const { onboardingStep, onboardingActive, advanceOnboarding, handleOnboardingComplete } = useOnboarding({
        user,
        isGuest,
        completeOnboarding,
    });

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault();
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
        };

        setLocalItems((prev) => [...prev, newItem]);

        if (onboardingStep === "place-computer") {
            advanceOnboarding();
        }
    };

    if (!isGuest && !room) {
        return (
            <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-xl">
                Loading your cozytab...
            </div>
        );
    }

    const handleMouseEvent = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        
        const rect = containerRef.current.getBoundingClientRect();
        const roomX = (e.clientX - rect.left) / scale;
        const roomY = (e.clientY - rect.top) / scale;
        updateCursor(roomX, roomY, e.clientX, e.clientY);
    };

    const musicItems = (room?.items as RoomItem[] | undefined)?.filter(
        (item) => item.musicUrl && item.musicType
    ) ?? [];

    return (
        <div
            className={`relative w-screen h-screen overflow-hidden font-['Patrick_Hand'] bg-black flex items-center justify-center cursor-hidden ${
                draggedItemId ? "select-none" : ""
            }`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onMouseMove={handleMouseEvent}
            onMouseEnter={handleMouseEvent}
        >
            <div
                ref={containerRef}
                style={{
                    width: ROOM_WIDTH,
                    height: ROOM_HEIGHT,
                    transform: `scale(${scale})`,
                    transformOrigin: "center",
                    position: "relative",
                    flexShrink: 0,
                }}
            >
                <div
                    className="absolute inset-0"
                    style={{
                        backgroundImage: backgroundUrl ? `url('${backgroundUrl}')` : undefined,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                        backgroundColor: backgroundUrl ? undefined : "#1a1a1a",
                        zIndex: 0,
                    }}
                    onClick={() => setSelectedId(null)}
                />

                {localItems.map((item) => (
                    <ItemNode
                        key={item.id}
                        item={item}
                        isSelected={item.id === selectedId}
                        mode={mode}
                        scale={scale}
                        onSelect={() => {
                            setSelectedId(item.id)
                        }}
                        onChange={(newItem) => {
                            setLocalItems((prev) =>
                                prev.map((i) => (i.id === newItem.id ? newItem : i))
                            );
                        }}
                        onDragStart={() => setDraggedItemId(item.id)}
                        onDragEnd={() => setDraggedItemId(null)}
                        onComputerClick={() => {
                            if (!isGuest && mode === "view") {
                                setIsComputerOpen(true);
                                if (onboardingStep === "click-computer") {
                                    advanceOnboarding();
                                }
                            }
                        }}
                        onMusicPlayerClick={() => {
                            if (!isGuest && mode === "view") {
                                setMusicPlayerItemId(item.id);
                            }
                        }}
                        isOnboardingComputerTarget={onboardingStep === "click-computer"}
                    />
                ))}

                {room && musicItems.map((item) => (
                    <MusicPlayerButtons
                        key={`music-buttons-${item.id}`}
                        item={item}
                        roomId={room._id}
                    />
                ))}

                {!isGuest && visitorId && visitors
                    .filter((v) => v.visitorId !== visitorId)
                    .map((visitor) => (
                        <PresenceCursor
                            key={visitor.visitorId}
                            name={visitor.displayName}
                            isOwner={visitor.isOwner}
                            actions={visitor.actions}
                        />
                    ))}
            </div>

            <div className="absolute top-4 left-4 flex gap-3 pointer-events-auto items-center" style={{ zIndex: 50 }}>
                {isGuest ? (
                    <SignInButton mode="modal">
                        <Button size="lg" className="font-bold text-lg shadow-lg">
                            <LogIn className="mr-2 h-5 w-5" />
                            Login
                        </Button>
                    </SignInButton>
                ) : (
                    <>
                        <div className="flex flex-col items-center gap-1">
                            <button
                                data-onboarding="mode-toggle"
                                onClick={() => {
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
                                }}
                                className={`
                                    relative h-14 w-14 rounded-full border-4 shadow-[0_4px_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all
                                    flex items-center justify-center
                                    ${mode === "view" 
                                        ? "bg-emerald-400 border-emerald-600 text-emerald-900" 
                                        : "bg-amber-400 border-amber-600 text-amber-900"
                                    }
                                `}
                            >
                                {mode === "view" ? (
                                    <Lock className="h-7 w-7" />
                                ) : (
                                    <LockOpen className="h-7 w-7" />
                                )}
                            </button>
                            <span className="font-['Patrick_Hand'] text-white text-lg font-bold drop-shadow-md select-none">
                                {mode === "view" ? "View" : "Edit"}
                            </span>
                        </div>

                        {/* Share Button */}
                        <div className="flex flex-col items-center gap-1">
                            <button
                                onClick={() => setIsShareModalOpen(true)}
                                className="relative h-14 w-14 rounded-full border-4 shadow-[0_4px_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-[4px] transition-all flex items-center justify-center bg-indigo-400 border-indigo-600 text-indigo-900"
                            >
                                <Share2 className="h-7 w-7" />
                                {visitorCount > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                                        {visitorCount}
                                    </span>
                                )}
                            </button>
                            <span className="font-['Patrick_Hand'] text-white text-lg font-bold drop-shadow-md select-none">
                                Share
                            </span>
                        </div>
                    </>
                )}
            </div>

            {showRewardNotification && (
                <div 
                    className="absolute top-20 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 fade-in duration-300"
                    onClick={() => setShowRewardNotification(false)}
                >
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl px-6 py-3 shadow-xl border-2 border-emerald-400 flex items-center gap-3 cursor-pointer hover:scale-105 transition-transform">
                        <Gift className="h-6 w-6" />
                        <div>
                            <div className="font-bold text-lg">Daily Reward!</div>
                            <div className="text-emerald-100 text-sm">+1 token added to your balance</div>
                        </div>
                    </div>
                </div>
            )}

            {mode === "edit" && (
                <div
                    className="absolute top-1/2 transform -translate-y-1/2 z-50 transition-all duration-300"
                    style={{ right: isDrawerOpen ? "180px" : "20px" }}
                >
                    <button
                        data-onboarding="drawer-toggle"
                        onClick={() => {
                            const wasOpen = isDrawerOpen;
                            setIsDrawerOpen(!isDrawerOpen);
                            if (!wasOpen && onboardingStep === "open-storage") {
                                advanceOnboarding();
                            }
                        }}
                        className="bg-[#c7b299] hover:bg-[#b5a18b] text-[#5c4d3c] h-16 w-8 rounded-l-lg border-y-4 border-l-4 border-[#a6927d] shadow-lg flex items-center justify-center transition-colors outline-none active:scale-95"
                    >
                        {isDrawerOpen ? (
                            <ChevronRight className="h-6 w-6" />
                        ) : (
                            <ChevronLeft className="h-6 w-6" />
                        )}
                    </button>
                </div>
            )}

            {mode === "edit" && (
                <AssetDrawer
                    isOpen={isDrawerOpen}
                    onDragStart={(e: React.DragEvent, id: string) => {
                        e.dataTransfer.setData("catalogItemId", id);
                    }}
                    highlightComputer={onboardingStep === "place-computer"}
                />
            )}

            {mode === "edit" && (
                <TrashCan
                    draggedItemId={draggedItemId}
                    onDelete={(itemId) => {
                        setLocalItems((prev) => prev.filter((item) => item.id !== itemId));
                        setSelectedId((current) => current === itemId ? null : current);
                    }}
                />
            )}

            {!isGuest && isComputerOpen && room && (
                <ComputerScreen
                    shortcuts={localShortcuts}
                    onClose={() => setIsComputerOpen(false)}
                    onUpdateShortcuts={(shortcuts) => {
                        setLocalShortcuts(shortcuts);
                        if (room) {
                            saveShortcuts({ roomId: room._id, shortcuts });
                        }
                    }}
                    onOpenShop={() => {
                        setIsComputerOpen(false);
                        setIsShopOpen(true);
                        if (onboardingStep === "open-shop") {
                            advanceOnboarding();
                        }
                    }}
                    isOnboardingShopStep={onboardingStep === "open-shop"}
                />
            )}

            {!isGuest && isShopOpen && user && (
                <Shop
                    onClose={() => setIsShopOpen(false)}
                    userCurrency={user.currency}
                    isOnboardingBuyStep={onboardingStep === "buy-item"}
                    onOnboardingPurchase={() => {
                        if (onboardingStep === "buy-item") {
                            advanceOnboarding();
                        }
                    }}
                />
            )}

            {!isGuest && musicPlayerItemId && room && (() => {
                const item = localItems.find((i) => i.id === musicPlayerItemId);
                return item ? (
                    <MusicPlayerModal
                        item={item}
                        onClose={() => setMusicPlayerItemId(null)}
                        onSave={(updatedItem) => {
                            const updatedItems = localItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
                            setLocalItems(updatedItems);
                            saveRoom({ roomId: room._id, items: updatedItems });
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

            {!isGuest && onboardingActive && onboardingStep && (
                <Onboarding
                    currentStep={onboardingStep}
                    onComplete={handleOnboardingComplete}
                />
            )}

            {!isGuest && hasVisitors && (
                <ChatInput
                    onMessageChange={updateChatMessage}
                    disabled={isComputerOpen || isShopOpen || musicPlayerItemId !== null || isShareModalOpen}
                />
            )}

            {!isGuest && hasVisitors && !isComputerOpen && !isShopOpen && !musicPlayerItemId && !isShareModalOpen && (
                <div className="absolute bottom-4 left-4 z-50 pointer-events-none">
                    <div className="bg-gray-900/70 text-white text-sm px-3 py-1.5 rounded-lg backdrop-blur-sm">
                        <span className="font-mono bg-gray-700 px-1.5 py-0.5 rounded text-xs mr-1.5">/</span>
                        <span style={{ fontFamily: "'Patrick Hand', cursive" }}>to chat</span>
                    </div>
                </div>
            )}

            <LocalCursor
                x={screenCursor.x}
                y={screenCursor.y}
                chatMessage={!isGuest && hasVisitors ? localChatMessage : null}
            />
        </div>
    );
}
