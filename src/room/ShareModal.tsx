import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Copy, Check, Share2, RefreshCw, Power } from "lucide-react";

interface ShareModalProps {
    onClose: () => void;
    visitorCount: number;
}

export function ShareModal({ onClose }: ShareModalProps) {
    const activeInvites = useQuery(api.invites.getMyActiveInvites);
    const createInvite = useMutation(api.invites.createInvite);
    const revokeInvite = useMutation(api.invites.revokeInvite);
    const rotateInviteCode = useMutation(api.invites.rotateInviteCode);

    const [copied, setCopied] = useState(false);
    const [isRotating, setIsRotating] = useState(false);

    const activeInvite = activeInvites?.[0];
    const inviteCode = activeInvite
        ? ((activeInvite as { token: string; code?: string }).code ?? activeInvite.token)
        : null;
    const shareUrl = inviteCode ? `${window.location.origin}/visit/${inviteCode}` : null;

    const handleResetCode = async () => {
        setIsRotating(true);
        try {
            if (activeInvite) await rotateInviteCode();
            else await createInvite();
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
            return;
        }
        await createInvite();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <div
                className="w-full max-w-md"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Main Card */}
                <div className="relative overflow-hidden rounded-3xl border-2 border-neutral-900 bg-[#f8f4ec] shadow-[8px_8px_0px_0px_rgba(23,23,23,1)]">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-neutral-900 bg-[#fff7e6] px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-neutral-900 bg-white shadow-[2px_2px_0px_0px_rgba(23,23,23,1)]">
                                <Share2 className="h-5 w-5 text-neutral-900" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold leading-none text-neutral-900">
                                    Share Room
                                </h2>
                                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mt-1">
                                    Invite Friends
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-neutral-900 bg-white transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none shadow-[2px_2px_0px_0px_rgba(23,23,23,1)]"
                        >
                            <X className="h-5 w-5 text-neutral-900" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-6 p-6">
                        
                        {/* 1. Toggle Switch Block */}
                        <div className="flex items-center justify-between rounded-xl border-2 border-neutral-900 bg-white p-4 shadow-[4px_4px_0px_0px_rgba(23,23,23,0.2)]">
                            <div className="space-y-0.5">
                                <div className="text-sm font-bold text-neutral-900">
                                    Public Access
                                </div>
                                <div className="text-xs font-medium text-neutral-500">
                                    {shareUrl ? "Anyone with the link can visit" : "Sharing is currently disabled"}
                                </div>
                            </div>
                            <button
                                onClick={handleToggleAccess}
                                className={`relative h-8 w-14 rounded-full border-2 border-neutral-900 transition-colors ${
                                    shareUrl ? "bg-emerald-400" : "bg-neutral-200"
                                }`}
                            >
                                <span
                                    className={`absolute top-1 left-1 h-5 w-5 rounded-full border-2 border-neutral-900 bg-white transition-transform ${
                                        shareUrl ? "translate-x-6" : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>

                        {shareUrl ? (
                            /* Active State */
                            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                                {/* Link Input */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase text-neutral-900">
                                            Invite Link
                                        </label>
                                        <button 
                                            onClick={handleResetCode}
                                            disabled={isRotating}
                                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
                                        >
                                            <RefreshCw className={`h-3 w-3 ${isRotating ? 'animate-spin' : ''}`} />
                                            Rotate Code
                                        </button>
                                    </div>
                                    <Input
                                        value={shareUrl}
                                        readOnly
                                        className="h-12 border-2 border-neutral-900 bg-white font-mono text-sm text-neutral-600 shadow-[2px_2px_0px_0px_rgba(23,23,23,0.1)] focus-visible:ring-0 focus-visible:shadow-[4px_4px_0px_0px_rgba(23,23,23,0.2)] transition-all"
                                    />
                                </div>

                                {/* Copy Button (Big CTA) */}
                                <Button
                                    onClick={handleCopyLink}
                                    className={`h-12 w-full border-2 border-neutral-900 text-base font-bold shadow-[4px_4px_0px_0px_rgba(23,23,23,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
                                        copied
                                            ? "bg-emerald-400 text-neutral-900 hover:bg-emerald-400"
                                            : "bg-neutral-900 text-white hover:bg-neutral-800"
                                    }`}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="mr-2 h-5 w-5" />
                                            Copied to clipboard!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-2 h-5 w-5" />
                                            Copy Invite Link
                                        </>
                                    )}
                                </Button>
                            </div>
                        ) : (
                            /* Empty State */
                            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50/50 py-8 text-center">
                                <div className="mb-2 rounded-full bg-neutral-200 p-3">
                                    <Power className="h-6 w-6 text-neutral-400" />
                                </div>
                                <p className="text-sm font-medium text-neutral-500 max-w-[200px]">
                                    Toggle access on to generate a unique link for this room.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}