import { useState, useCallback, useEffect, useRef } from "react";
import { useUser } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { VisitorState } from "@/hooks/useWebSocketPresence";
import type { RoomItem } from "@shared/guestTypes";
import type { Id } from "@convex/_generated/dataModel";
import { PresenceCursor } from "./PresenceCursor";
import { UserPlus, Check, Clock, Users } from "lucide-react";

interface PresenceLayerProps {
    visitors: VisitorState[];
    currentVisitorId: string | null;
    scale: number;
    currentGameId?: string | null;
    items?: RoomItem[];
}

export function PresenceLayer({
    visitors,
    currentVisitorId,
    scale,
    currentGameId,
    items,
}: PresenceLayerProps) {
    const [clickedVisitorId, setClickedVisitorId] = useState<string | null>(null);

    const handleCursorClick = useCallback((visitorId: string) => {
        setClickedVisitorId((prev) => (prev === visitorId ? null : visitorId));
    }, []);

    const handleClosePopup = useCallback(() => {
        setClickedVisitorId(null);
    }, []);

    return (
        <>
            {visitors
                .filter((visitor) => {
                    if (visitor.visitorId === currentVisitorId) return false;
                    if (currentGameId && visitor.inGame === currentGameId) return false;
                    return true;
                })
                .map((visitor) => {
                    const isInDifferentGame = Boolean(visitor.inGame && visitor.inGame !== currentGameId);

                    let cursorX = visitor.x;
                    let cursorY = visitor.y;

                    if (visitor.inGame && items) {
                        const item = items.find((i) => i.id === visitor.inGame);
                        if (item) {
                            cursorX = item.x;
                            cursorY = item.y;
                        }
                    }

                    return (
                        <div key={visitor.visitorId}>
                            <PresenceCursor
                                name={visitor.displayName}
                                isOwner={visitor.isOwner}
                                x={cursorX}
                                y={cursorY}
                                chatMessage={visitor.chatMessage}
                                scale={scale}
                                cursorColor={visitor.cursorColor}
                                inMenu={visitor.inMenu}
                                tabbedOut={visitor.tabbedOut}
                                dimmed={isInDifferentGame}
                                onClick={() => handleCursorClick(visitor.visitorId)}
                            />
                            {clickedVisitorId === visitor.visitorId && visitor.convexUserId && (
                                <FriendPopup
                                    visitor={visitor}
                                    x={cursorX}
                                    y={cursorY}
                                    scale={scale}
                                    onClose={handleClosePopup}
                                />
                            )}
                        </div>
                    );
                })}
        </>
    );
}

function FriendPopup({
    visitor,
    x,
    y,
    scale,
    onClose,
}: {
    visitor: VisitorState;
    x: number;
    y: number;
    scale: number;
    onClose: () => void;
}) {
    const popupRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("pointerdown", handleClickOutside);
        return () => document.removeEventListener("pointerdown", handleClickOutside);
    }, [onClose]);

    const { isSignedIn } = useUser();
    const convexUserId = visitor.convexUserId as Id<"users"> | undefined;
    const friendshipStatus = useQuery(
        api.friends.getFriendshipWith,
        isSignedIn && convexUserId ? { userId: convexUserId } : "skip"
    );
    const sendRequest = useMutation(api.friends.sendFriendRequestByUserId);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resultMessage, setResultMessage] = useState<string | null>(null);

    if (!isSignedIn || !convexUserId) return null;

    const handleSend = async () => {
        setSending(true);
        setError(null);
        try {
            const result = await sendRequest({ userId: convexUserId });
            setSent(true);
            if (result.alreadyFriends) {
                setResultMessage("Already friends!");
            } else if (result.alreadyPending) {
                setResultMessage("Request already sent!");
            } else if (result.autoAccepted) {
                setResultMessage("You're now friends!");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed");
        } finally {
            setSending(false);
        }
    };

    const popupStyle = {
        position: "absolute" as const,
        left: x + 50,
        top: y - 20,
        transform: `scale(${scale > 0 ? 1 / scale : 1})`,
        transformOrigin: "top left",
        zIndex: 200,
    };

    let content;
    if (friendshipStatus === undefined) {
        content = <span className="text-xs text-stone-400">Loading...</span>;
    } else if (friendshipStatus?.status === "accepted") {
        content = (
            <span className="flex items-center gap-1.5 text-xs text-purple-600 font-medium">
                <Users className="h-3.5 w-3.5" />
                Friends
            </span>
        );
    } else if (friendshipStatus?.status === "pending") {
        content = (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                <Clock className="h-3.5 w-3.5" />
                Pending...
            </span>
        );
    } else if (sent) {
        content = (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <Check className="h-3.5 w-3.5" />
                {resultMessage ?? "Request sent!"}
            </span>
        );
    } else {
        content = (
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    handleSend();
                }}
                disabled={sending}
                className="flex items-center gap-1.5 text-xs font-medium text-purple-700 hover:text-purple-900 transition-colors disabled:opacity-50"
            >
                <UserPlus className="h-3.5 w-3.5" />
                {sending ? "Sending..." : "Add Friend"}
            </button>
        );
    }

    return (
        <div
            ref={popupRef}
            style={popupStyle}
            className="pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-white rounded-lg shadow-lg border border-stone-200 px-3 py-2 min-w-[120px] font-['Patrick_Hand']">
                <div className="text-sm font-medium text-stone-800 mb-1">{visitor.displayName}</div>
                {content}
                {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
            </div>
        </div>
    );
}
