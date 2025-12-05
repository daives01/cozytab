import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Copy, Check, Link2, Trash2, Users, Share2 } from "lucide-react";

interface ShareModalProps {
    onClose: () => void;
    visitorCount: number;
}

export function ShareModal({ onClose, visitorCount }: ShareModalProps) {
    const activeInvites = useQuery(api.invites.getMyActiveInvites);
    const createInvite = useMutation(api.invites.createInvite);
    const revokeInvite = useMutation(api.invites.revokeInvite);

    const [copied, setCopied] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    const activeInvite = activeInvites?.[0];
    const shareUrl = activeInvite
        ? `${window.location.origin}/visit/${activeInvite.token}`
        : null;

    const handleCreateLink = async () => {
        setIsCreating(true);
        try {
            await createInvite();
        } finally {
            setIsCreating(false);
        }
    };

    const handleCopyLink = async () => {
        if (!shareUrl) return;
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleRevokeLink = async () => {
        if (!activeInvite) return;
        await revokeInvite({ inviteId: activeInvite._id });
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="rounded-2xl border-2 border-neutral-900 bg-[#f8f4ec] shadow-[6px_6px_0px_0px_rgba(31,41,55,0.35)] overflow-hidden">
                    <div className="flex items-center justify-between bg-[#fff7e6] px-6 py-4 border-b-2 border-neutral-900">
                        <div className="flex items-center gap-3">
                            <span className="rounded-full bg-white p-2 border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.4)]">
                                <Share2 className="h-5 w-5 text-neutral-800" />
                            </span>
                            <div>
                                <p className="text-xs uppercase tracking-[0.08em] text-neutral-700 font-semibold">
                                    Invite friends
                                </p>
                                <h2 className="text-2xl font-bold text-neutral-900 leading-tight">
                                    Share your cozy room
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

                    <div className="p-6 space-y-5">
                        <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-neutral-800">
                            <div className="flex items-center gap-2 rounded-xl border-2 border-neutral-900 bg-emerald-100 px-3 py-2 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.3)]">
                                <Users className="h-4 w-4 text-emerald-700" />
                                <span>
                                    {visitorCount > 0
                                        ? `${visitorCount} ${visitorCount === 1 ? "visitor" : "visitors"} hanging out`
                                        : "No visitors yet"}
                                </span>
                            </div>
                        </div>

                        {shareUrl ? (
                            <div className="space-y-4">
                                <div className="rounded-xl border-2 border-neutral-900 bg-white px-4 py-3 shadow-[3px_3px_0px_0px_rgba(31,41,55,0.3)]">
                                    <div className="flex items-start gap-3">
                                        <div className="mt-1 rounded-lg bg-amber-200 px-2 py-1 text-xs font-semibold uppercase text-neutral-900 border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.3)]">
                                            Ready
                                        </div>
                                        <div className="flex-1 space-y-3">
                                            <p className="text-neutral-700 font-medium">
                                                Share this link with friends:
                                            </p>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={shareUrl}
                                                    readOnly
                                                    className="bg-neutral-50 font-mono text-sm border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.25)]"
                                                />
                                                <Button
                                                    onClick={handleCopyLink}
                                                    className={`shrink-0 border-2 border-neutral-900 shadow-[2px_2px_0px_0px_rgba(31,41,55,0.25)] ${
                                                        copied
                                                            ? "bg-emerald-500 hover:bg-emerald-600 text-neutral-900"
                                                            : "bg-neutral-900 hover:bg-neutral-800 text-white"
                                                    }`}
                                                >
                                                    {copied ? (
                                                        <>
                                                            <Check className="h-4 w-4 mr-1" />
                                                            Copied!
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Copy className="h-4 w-4 mr-1" />
                                                            Copy
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                            <p className="text-xs text-neutral-600">
                                                Visitors with this link can explore in view-only mode. You can revoke it anytime.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-xl border-2 border-neutral-900 bg-white px-4 py-3 shadow-[3px_3px_0px_0px_rgba(31,41,55,0.25)]">
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-neutral-700">
                                        <div>
                                            <p className="font-semibold text-neutral-900">Copy</p>
                                            <p>Send it to friends.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-neutral-900">Visit</p>
                                            <p>They join instantly.</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-neutral-900">Revoke</p>
                                            <p>End access anytime.</p>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={handleRevokeLink}
                                    className="w-full border-2 border-neutral-900 text-red-600 hover:bg-red-50 hover:text-red-700 shadow-[3px_3px_0px_0px_rgba(31,41,55,0.25)]"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Revoke link & disconnect visitors
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="rounded-xl border-2 border-neutral-900 bg-white px-6 py-7 text-center shadow-[3px_3px_0px_0px_rgba(31,41,55,0.25)]">
                                    <Link2 className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
                                    <p className="text-neutral-700 font-medium mb-1">
                                        Generate an invite for your room
                                    </p>
                                    <p className="text-sm text-neutral-600">
                                        Friends get a read-only peek. You stay in control.
                                    </p>
                                </div>

                                <Button
                                    onClick={handleCreateLink}
                                    disabled={isCreating}
                                    className="w-full bg-neutral-900 hover:bg-neutral-800 text-white text-lg py-4 border-2 border-neutral-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,0.35)]"
                                >
                                    {isCreating ? (
                                        "Creating..."
                                    ) : (
                                        <>
                                            <Link2 className="h-5 w-5 mr-2" />
                                            Generate share link
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

