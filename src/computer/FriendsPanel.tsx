import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Check, UserPlus, Users, Clock, X, ExternalLink, Gift } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

type Tab = "friends" | "requests" | "add";

interface FriendsPanelProps {
    isGuest?: boolean;
}

export function FriendsPanel({ isGuest = false }: FriendsPanelProps) {
    const [activeTab, setActiveTab] = useState<Tab>("friends");

    if (isGuest) {
        return (
            <div className="bg-stone-50 w-full h-full flex items-center justify-center p-4">
                <p className="text-stone-600 text-sm font-medium">Log in to use Friends!</p>
            </div>
        );
    }

    return (
        <div className="bg-stone-50 w-full h-full flex flex-col overflow-hidden">
            <div className="flex border-b border-stone-200">
                <TabButton label="Friends" icon={<Users className="h-3.5 w-3.5" />} active={activeTab === "friends"} onClick={() => setActiveTab("friends")} />
                <TabButton label="Requests" icon={<Clock className="h-3.5 w-3.5" />} active={activeTab === "requests"} onClick={() => setActiveTab("requests")} />
                <TabButton label="Add Friend" icon={<UserPlus className="h-3.5 w-3.5" />} active={activeTab === "add"} onClick={() => setActiveTab("add")} />
            </div>
            <div className="flex-1 overflow-y-auto">
                {activeTab === "friends" && <FriendsTab />}
                {activeTab === "requests" && <RequestsTab />}
                {activeTab === "add" && <AddFriendTab />}
            </div>
        </div>
    );
}

function TabButton({ label, icon, active, onClick }: { label: string; icon: React.ReactNode; active: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                active
                    ? "bg-white text-purple-700 border-b-2 border-purple-500"
                    : "text-stone-500 hover:text-stone-700 hover:bg-stone-100"
            }`}
        >
            {icon}
            {label}
        </button>
    );
}

function FriendsTab() {
    const friends = useQuery(api.friends.getMyFriends);
    const removeFriend = useMutation(api.friends.removeFriend);
    const [confirmRemove, setConfirmRemove] = useState<Id<"friendships"> | null>(null);

    if (friends === undefined) {
        return (
            <div className="p-4 text-sm text-stone-400 text-center">
                Loading...
            </div>
        );
    }

    if (friends.length === 0) {
        return (
            <div className="p-4 text-sm text-stone-500 text-center">
                <p>No friends yet.</p>
                <p className="mt-1 text-xs">Use the "Add Friend" tab to get started!</p>
            </div>
        );
    }

    const now = Date.now();

    return (
        <div className="divide-y divide-stone-100">
            {friends.map((friend) => {
                if (!friend) return null;
                const isOnline = friend.lastSeenAt != null && now - friend.lastSeenAt < ONLINE_THRESHOLD_MS;

                return (
                    <div key={friend.userId} className="flex items-center gap-3 px-4 py-3 hover:bg-stone-100/50">
                        <div className="relative">
                            <div
                                className="w-8 h-8 rounded-full border-2 border-stone-300"
                                style={{ backgroundColor: friend.cursorColor ?? "#a78bfa" }}
                            />
                            <div
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-stone-50 ${
                                    isOnline ? "bg-green-500" : "bg-stone-300"
                                }`}
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-stone-800 truncate">{friend.displayName}</div>
                            <div className="text-xs text-stone-400">{isOnline ? "Online" : "Offline"}</div>
                        </div>
                        <div className="flex items-center gap-1.5">
                            {friend.activeRoomId && (
                                <a
                                    href={`/friend/${friend.userId}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-100 hover:bg-purple-200 rounded transition-colors"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    Visit
                                </a>
                            )}
                            {confirmRemove === friend.friendshipId ? (
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={async () => {
                                            await removeFriend({ friendshipId: friend.friendshipId });
                                            setConfirmRemove(null);
                                        }}
                                        className="text-xs text-red-600 hover:text-red-800 font-medium px-1.5 py-0.5"
                                    >
                                        Confirm
                                    </button>
                                    <button
                                        onClick={() => setConfirmRemove(null)}
                                        className="text-xs text-stone-400 hover:text-stone-600 px-1"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmRemove(friend.friendshipId)}
                                    className="text-xs text-stone-400 hover:text-red-500 transition-colors px-1"
                                    title="Remove friend"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function RequestsTab() {
    const pendingRequests = useQuery(api.friends.getMyPendingRequests);
    const acceptRequest = useMutation(api.friends.acceptFriendRequest);
    const declineRequest = useMutation(api.friends.declineFriendRequest);
    const cancelRequest = useMutation(api.friends.cancelFriendRequest);

    if (pendingRequests === undefined) {
        return (
            <div className="p-4 text-sm text-stone-400 text-center">
                Loading...
            </div>
        );
    }

    const { incoming, outgoing } = pendingRequests;
    const hasNone = incoming.length === 0 && outgoing.length === 0;

    if (hasNone) {
        return (
            <div className="p-4 text-sm text-stone-500 text-center">
                No pending requests.
            </div>
        );
    }

    return (
        <div className="divide-y divide-stone-100">
            {incoming.length > 0 && (
                <div>
                    <div className="px-4 py-2 bg-stone-100/50 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                        Incoming
                    </div>
                    {incoming.map((req) => (
                        <div key={req.friendshipId} className="flex items-center gap-3 px-4 py-3">
                            <div
                                className="w-7 h-7 rounded-full border-2 border-stone-300"
                                style={{ backgroundColor: req.cursorColor ?? "#a78bfa" }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-stone-800 truncate">{req.displayName}</div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    size="sm"
                                    className="h-7 px-2.5 text-xs bg-purple-600 hover:bg-purple-500"
                                    onClick={() => acceptRequest({ friendshipId: req.friendshipId })}
                                >
                                    Accept
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2.5 text-xs"
                                    onClick={() => declineRequest({ friendshipId: req.friendshipId })}
                                >
                                    Decline
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {outgoing.length > 0 && (
                <div>
                    <div className="px-4 py-2 bg-stone-100/50 text-xs font-semibold text-stone-500 uppercase tracking-wide">
                        Outgoing
                    </div>
                    {outgoing.map((req) => (
                        <div key={req.friendshipId} className="flex items-center gap-3 px-4 py-3">
                            <div
                                className="w-7 h-7 rounded-full border-2 border-stone-300"
                                style={{ backgroundColor: req.cursorColor ?? "#a78bfa" }}
                            />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-stone-800 truncate">{req.displayName}</div>
                                <div className="text-xs text-stone-400">Pending...</div>
                            </div>
                            <button
                                onClick={() => cancelRequest({ friendshipId: req.friendshipId })}
                                className="text-xs text-stone-400 hover:text-red-500 transition-colors"
                                title="Cancel request"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

function AddFriendTab() {
    const myCode = useQuery(api.users.getMyReferralCode);
    const sendRequest = useMutation(api.friends.sendFriendRequest);
    const [linkCopied, setLinkCopied] = useState(false);
    const [inputCode, setInputCode] = useState("");
    const [sending, setSending] = useState(false);
    const [sendResult, setSendResult] = useState<{ success: boolean; message: string } | null>(null);

    const friendLink = myCode ? `${window.location.origin}/?friendRef=${myCode}` : null;

    const handleCopyLink = async () => {
        if (!friendLink) return;
        await navigator.clipboard.writeText(friendLink);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
    };

    const handleSend = async () => {
        const code = inputCode.trim();
        if (!code) return;
        setSending(true);
        setSendResult(null);
        try {
            const result = await sendRequest({ friendCode: code });
            if (result.alreadyFriends) {
                setSendResult({ success: true, message: "You're already friends!" });
            } else if (result.alreadyPending) {
                setSendResult({ success: true, message: "Friend request already sent!" });
            } else if (result.autoAccepted) {
                setSendResult({ success: true, message: "You're now friends!" });
            } else {
                setSendResult({ success: true, message: "Friend request sent!" });
            }
            setInputCode("");
        } catch (err) {
            setSendResult({ success: false, message: err instanceof Error ? err.message : "Failed to send request" });
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="p-4 space-y-5">
            <div className="space-y-2.5">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Invite a Friend</div>
                <div className="flex items-center gap-2 text-stone-600 text-xs">
                    <Gift className="h-3.5 w-3.5 text-pink-500 shrink-0" />
                    <span>Earn <strong>3 cozy coins</strong> when they join!</span>
                </div>
                {myCode ? (
                    <div className="space-y-2">
                        <div className="flex gap-2 items-center">
                            <div className="flex-1 bg-white border border-stone-300 rounded px-3 py-1.5 text-sm font-mono tracking-wider text-stone-800 select-all">
                                {myCode}
                            </div>
                            <Button
                                size="sm"
                                className={`h-8 px-3 transition-colors ${linkCopied ? "bg-green-600 hover:bg-green-600" : "bg-purple-600 hover:bg-purple-500"}`}
                                onClick={handleCopyLink}
                            >
                                {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        {linkCopied && (
                            <div className="text-xs text-green-600 font-medium">Link copied to clipboard!</div>
                        )}
                    </div>
                ) : (
                    <div className="text-sm text-stone-400">Loading...</div>
                )}
            </div>

            <div className="border-t border-stone-200" />

            <div className="space-y-2">
                <div className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Add by Code</div>
                <div className="flex gap-2">
                    <Input
                        placeholder="Enter friend code"
                        value={inputCode}
                        onChange={(e) => {
                            setInputCode(e.target.value.toUpperCase());
                            setSendResult(null);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleSend();
                        }}
                        className="h-8 text-sm font-mono tracking-wider bg-white border-stone-300"
                        maxLength={8}
                    />
                    <Button
                        size="sm"
                        className="h-8 px-3 bg-purple-600 hover:bg-purple-500"
                        onClick={handleSend}
                        disabled={!inputCode.trim() || sending}
                    >
                        {sending ? "..." : "Send"}
                    </Button>
                </div>
                {sendResult && (
                    <div className={`text-xs font-medium ${sendResult.success ? "text-green-600" : "text-red-500"}`}>
                        {sendResult.message}
                    </div>
                )}
            </div>
        </div>
    );
}
