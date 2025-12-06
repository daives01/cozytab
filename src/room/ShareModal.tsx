import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Copy, Check, Share2, RefreshCw, Globe, Power } from "lucide-react";
import { cn } from "@/lib/utils";

interface ShareModalProps {
    onClose: () => void;
    visitorCount: number;
}

export function ShareModal({ onClose, visitorCount }: ShareModalProps) {
    const activeInvites = useQuery(api.invites.getMyActiveInvites);
    const createInvite = useMutation(api.invites.createInvite);
    const revokeInvite = useMutation(api.invites.revokeInvite);
    const rotateInviteCode = useMutation(api.invites.rotateInviteCode);

    const [copied, setCopied] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [recentToggle, setRecentToggle] = useState<"on" | "off" | null>(null);

    const activeInvite = activeInvites?.[0];
    const inviteCode = activeInvite?.code ?? activeInvite?.token ?? null;
    const shareUrl = inviteCode ? `${window.location.origin}/visit/${inviteCode}` : null;
    const isSharing = Boolean(shareUrl);

    const markRecentToggle = (state: "on" | "off") => {
        setRecentToggle(state);
        setTimeout(() => setRecentToggle(null), 300);
    };

    const handleResetCode = async () => {
        setIsRotating(true);
        try {
            if (activeInvite) {
                await rotateInviteCode();
            } else {
                await createInvite();
            }
            setCopied(false);
        } finally {
            setIsRotating(false);
        }
    };

    const handleCopyLink = async () => {
        if (!shareUrl) return;
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleToggleAccess = async () => {
        if (activeInvite) {
            await revokeInvite({ inviteId: activeInvite._id });
            setCopied(false);
            markRecentToggle("off");
            return;
        }
        await createInvite();
        markRecentToggle("on");
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-900/25 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative overflow-hidden rounded-3xl border-2 border-neutral-900 bg-[#f8f4ec] shadow-[8px_8px_0px_0px_rgba(31,41,55,0.35)]">
                    <div className="absolute -top-16 -right-12 h-40 w-40 rounded-full bg-orange-100/40 blur-3xl" />
                    <div className="absolute -bottom-10 -left-16 h-32 w-32 rounded-full bg-amber-100/50 blur-3xl" />

                    <div className="relative flex items-center justify-between bg-[#fff7e6] px-6 py-4 border-b-2 border-neutral-900">
                        <div className="flex items-center gap-3">
                            <span className="rounded-full bg-white p-2 border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.4)]">
                                <Share2 className="h-5 w-5 text-neutral-800" />
                            </span>
                            <div>
                                <p className="text-xs uppercase tracking-[0.08em] text-neutral-700 font-semibold">
                                    Invite friends
                                </p>
                                <h2 className="text-2xl font-bold text-neutral-900 leading-tight">
                                    Share your room
                                </h2>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="rounded-full border-2 border-neutral-900 bg-white p-2 text-neutral-700 hover:bg-neutral-100 transition-colors shadow-[2px_2px_0px_0px_rgba(31,41,55,0.4)]"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="relative p-6">
                        {!isSharing ? (
                            <div
                                className={cn(
                                    "flex flex-col items-center justify-center gap-5 rounded-2xl border-2 border-neutral-900 bg-white px-6 py-10 text-center shadow-[6px_6px_0px_0px_rgba(31,41,55,0.3)]",
                                    recentToggle === "off" && "animate-in fade-in slide-in-from-bottom-2 duration-300"
                                )}
                            >
                                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-neutral-900 bg-neutral-50 shadow-[3px_3px_0px_0px_rgba(31,41,55,0.25)] text-neutral-500">
                                    <Globe className="h-8 w-8" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-neutral-900">Your room is private</h3>
                                    <p className="text-sm text-neutral-700 max-w-sm">
                                        Turn on sharing to get a unique link for friends to visit. You can switch it off anytime.
                                    </p>
                                </div>
                                <Button
                                    onClick={handleToggleAccess}
                                    className="w-full rounded-xl border-2 border-neutral-900 bg-neutral-900 py-3 text-white shadow-[4px_4px_0px_0px_rgba(31,41,55,0.25)] transition active:translate-y-[1px]"
                                >
                                    Enable sharing
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-neutral-900 bg-white px-5 py-4 shadow-[4px_4px_0px_0px_rgba(31,41,55,0.3)]">
                                    <div className="flex items-center gap-3">
                                        <span className="inline-flex items-center gap-2 rounded-full border-2 border-neutral-900 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.2)]">
                                            <Globe className="h-4 w-4" />
                                            Sharing on
                                        </span>
                                        <p className="text-sm font-semibold text-neutral-900">
                                            Visitors can view with this link.
                                        </p>
                                    </div>
                                    <button
                                        onClick={handleToggleAccess}
                                        className="inline-flex items-center gap-2 rounded-full border-2 border-neutral-900 bg-white px-3 py-2 text-xs font-semibold text-red-500 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.2)] transition hover:bg-red-50"
                                    >
                                        <Power className="h-4 w-4" />
                                        Disable sharing
                                    </button>
                                </div>

                                <div className="relative rounded-2xl border-2 border-neutral-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(31,41,55,0.3)] space-y-3">
                                    <span className="absolute -top-3 left-4 bg-[#f8f4ec] px-2 py-0.5 text-xs font-semibold text-neutral-900 rounded-lg border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.15)]">
                                        Public link
                                    </span>
                                    <div className="flex flex-wrap items-center gap-3">
                                        <Input
                                            value={shareUrl ?? ""}
                                            readOnly
                                            tabIndex={-1}
                                            aria-readonly
                                            className="bg-neutral-50 font-mono text-sm border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.25)] flex-1 min-w-0"
                                        />
                                        <Button
                                            onClick={handleCopyLink}
                                            className={cn(
                                                "shrink-0 border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.25)] px-4",
                                                copied
                                                    ? "bg-emerald-500 hover:bg-emerald-600 text-neutral-900"
                                                    : "bg-neutral-900 hover:bg-neutral-800 text-white"
                                            )}
                                        >
                                            {copied ? (
                                                <>
                                                    <Check className="h-4 w-4 mr-1" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-4 w-4 mr-1" />
                                                    Copy link
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-neutral-600">
                                        <button
                                            onClick={handleResetCode}
                                            disabled={isRotating}
                                            className="inline-flex items-center gap-2 font-semibold text-neutral-700 hover:text-neutral-900 transition disabled:opacity-60"
                                        >
                                            <RefreshCw className={cn("h-4 w-4 stroke-[2.5]", isRotating && "animate-spin")} />
                                            Generate new link
                                        </button>
                                        <div className="inline-flex items-center gap-1 rounded-full border-2 border-neutral-900 bg-neutral-50 px-2 py-1 font-semibold text-neutral-800 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.15)]">
                                            {visitorCount} current visitors
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

