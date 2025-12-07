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
    const stateBlockHeight = "h-[150px]";

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
                <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--ink)] bg-[var(--paper)] shadow-[var(--shadow-ink-bold)]">
                    
                    {/* Header */}
                    <div className="flex items-center justify-between border-b-2 border-[var(--ink)] bg-[var(--paper-header)] px-6 py-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--card)] shadow-[var(--shadow-ink-strong)]">
                                <Share2 className="h-5 w-5 text-[var(--ink)]" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold leading-none text-[var(--ink)]">
                                    Share Room
                                </h2>
                                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-subtle)] mt-1">
                                    Invite Friends
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="group flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--ink)] bg-[var(--card)] transition-transform hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none shadow-[var(--shadow-ink-strong)]"
                        >
                            <X className="h-5 w-5 text-[var(--ink)]" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col gap-6 p-6">
                        
                        {/* 1. Toggle Switch Block */}
                        <div className="flex items-center justify-between rounded-xl border-2 border-[var(--ink)] bg-[var(--card)] p-4 shadow-[var(--shadow-ink-soft)]">
                            <div className="space-y-0.5">
                                <div className="text-sm font-bold text-[var(--ink)]">
                                    Public Access
                                </div>
                                <div className="text-xs font-medium text-[var(--ink-subtle)]">
                                    {shareUrl ? "Anyone with the link can visit" : "Sharing is currently disabled"}
                                </div>
                            </div>
                            <button
                                onClick={handleToggleAccess}
                                className={`relative h-8 w-14 rounded-full border-2 border-[var(--ink)] transition-colors ${
                                    shareUrl ? "bg-[var(--success)]" : "bg-[var(--muted)]"
                                }`}
                            >
                                <span
                                    className={`absolute top-1 left-1 h-5 w-5 rounded-full border-2 border-[var(--ink)] bg-[var(--card)] transition-transform ${
                                        shareUrl ? "translate-x-6" : "translate-x-0"
                                    }`}
                                />
                            </button>
                        </div>

                        {shareUrl ? (
                            /* Active State */
                            <div className={`space-y-4 animate-in fade-in slide-in-from-bottom-2 ${stateBlockHeight}`}>
                                {/* Link Input */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold uppercase text-[var(--ink)]">
                                            Invite Link
                                        </label>
                                        <button 
                                            onClick={handleResetCode}
                                            disabled={isRotating}
                                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--ink-subtle)] hover:text-[var(--ink)] disabled:opacity-50"
                                        >
                                            <RefreshCw className={`h-3 w-3 ${isRotating ? 'animate-spin' : ''}`} />
                                            Rotate Code
                                        </button>
                                    </div>
                                    <Input
                                        value={shareUrl}
                                        readOnly
                                        className="h-12 border-2 border-[var(--ink)] bg-[var(--card)] font-mono text-sm text-[var(--ink-muted)] shadow-[var(--shadow-ink-soft)] focus-visible:ring-0 focus-visible:shadow-[var(--shadow-ink-strong)] transition-all"
                                    />
                                </div>

                                {/* Copy Button (Big CTA) */}
                                <Button
                                    onClick={handleCopyLink}
                                    className={`h-12 w-full border-2 border-[var(--ink)] text-base font-bold shadow-[var(--shadow-ink-strong)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none ${
                                        copied
                                            ? "bg-[var(--success)] text-[var(--ink)] hover:bg-[var(--success)]"
                                            : "bg-[var(--ink)] text-[var(--primary-foreground)] hover:bg-[var(--ink-light)]"
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
                            <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--muted-foreground)] bg-[color-mix(in_srgb,var(--muted)_60%,transparent)] py-8 text-center ${stateBlockHeight}`}>
                                <div className="mb-2 rounded-full bg-[var(--muted)] p-3">
                                    <Power className="h-6 w-6 text-[var(--ink-subtle)]" />
                                </div>
                                <p className="text-sm font-medium text-[var(--ink-subtle)] max-w-[200px]">
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