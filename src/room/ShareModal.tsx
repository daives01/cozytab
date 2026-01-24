import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToggleSwitch } from "@/components/ui/toggle";
import { X, Copy, Check, Share2, RefreshCw, Lock, Globe, Link as LinkIcon } from "lucide-react";
import type { Doc } from "@convex/_generated/dataModel";

const handwritingFont = {
    fontFamily: "'Patrick Hand', 'Patrick Hand SC', sans-serif",
    fontWeight: 400,
    fontStyle: "normal",
    fontSynthesis: "none" as const,
    fontOpticalSizing: "none" as const,
};

interface ShareModalProps {
    onClose: () => void;
    activeInvites?: Doc<"roomInvites">[] | null;
}

export function ShareModal({ onClose, activeInvites }: ShareModalProps) {
    const enableInvite = useMutation(api.invites.enableInvite);
    const revokeInvite = useMutation(api.invites.revokeInvite);
    const rotateInviteCode = useMutation(api.invites.rotateInviteCode);

    const [copied, setCopied] = useState(false);
    const [isRotating, setIsRotating] = useState(false);
    const [now, setNow] = useState(() => Date.now());

    const activeInvite = activeInvites?.[0];
    const expiresAt = activeInvite?.expiresAt ?? 0;
    const inviteIsLive = !!activeInvite && expiresAt > now;
    const inviteCode = inviteIsLive ? activeInvite.code : null;
    const shareUrl = inviteCode ? `${window.location.origin}/visit/${inviteCode}` : null;

    useEffect(() => {
        if (!expiresAt) return;

        const remaining = expiresAt - Date.now();
        if (remaining <= 0) {
            setNow(Date.now());
            return;
        }

        const id = setTimeout(() => setNow(Date.now()), remaining + 10);
        return () => clearTimeout(id);
    }, [expiresAt]);

    const handleResetCode = async () => {
        setIsRotating(true);
        try {
            if (activeInvite) await rotateInviteCode();
            else await enableInvite();
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
        if (inviteIsLive && activeInvite) {
            await revokeInvite({ inviteId: activeInvite._id });
            setCopied(false);
            return;
        }
        await enableInvite();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-lg group"
                style={handwritingFont}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[var(--shadow-8)]">
                    <div className="flex items-center justify-between border-b-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] px-8 py-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-share-accent)] shadow-[var(--shadow-2)]">
                                <Share2 className="h-6 w-6 text-[var(--color-foreground)]" />
                            </div>
                            <div>
                                <h2 className="text-size-2xl font-bold leading-none text-[var(--color-foreground)]">
                                    Invite Friends
                                </h2>
                                <p className="mt-1 text-size-sm font-medium text-[var(--color-muted-foreground)]">
                                    Show off your cozy room
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="group/btn flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none shadow-[var(--shadow-2)]"
                        >
                            <X className="h-5 w-5 text-[var(--color-foreground)]" />
                        </button>
                    </div>

                    <div className="flex flex-col gap-8 p-8">
                        <div className="flex items-center justify-between rounded-2xl border-2 border-[var(--color-foreground)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-4-soft)]">
                            <div className="space-y-1">
                                <div className="text-size-lg font-bold text-[var(--color-foreground)] flex items-center gap-2">
                                    Public Access
                                    {shareUrl && (
                                        <span className="inline-flex items-center rounded-full border border-[var(--color-foreground)] bg-[var(--color-share-accent)] px-2 py-0.5 text-size-sm uppercase font-bold tracking-wider">
                                            Live
                                        </span>
                                    )}
                                </div>
                                <div className="text-size-sm font-medium text-[var(--color-muted-foreground)]">
                                    {shareUrl ? "Room is visible to visitors" : "Room is currently hidden"}
                                </div>
                            </div>
                            
                            <ToggleSwitch
                                aria-label="Toggle public access"
                                checked={!!shareUrl}
                                onCheckedChange={() => handleToggleAccess()}
                                activeClassName="bg-[var(--color-share-accent)]"
                                inactiveClassName="bg-[var(--color-muted)]"
                            />
                        </div>

                        <div className="relative h-[200px] w-full">
                            {shareUrl ? (
                                <div className="absolute inset-0 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-xs font-bold uppercase tracking-widest text-[var(--color-foreground)] flex items-center gap-2">
                                            <Globe className="h-3 w-3" />
                                            Active Link
                                        </label>
                                        <button 
                                            onClick={handleResetCode}
                                            disabled={isRotating}
                                            className="group flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors disabled:opacity-50"
                                        >
                                            <RefreshCw className={`h-3 w-3 ${isRotating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                                            Regenerate
                                        </button>
                                    </div>

                                    <div className="relative">
                                        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted-foreground)]">
                                            <LinkIcon className="h-5 w-5" />
                                        </div>
                                        <Input
                                            readOnly
                                            value={shareUrl}
                                            className="h-14 border-2 border-[var(--color-foreground)] bg-[var(--color-background)] pl-12 pr-4 font-mono text-size-sm text-[var(--color-foreground)] shadow-[var(--shadow-4-soft)] focus-visible:ring-0 focus-visible:border-[var(--color-share-accent)]"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleCopyLink}
                                        className={`mt-auto h-14 w-full border-2 border-[var(--color-foreground)] text-size-lg font-black uppercase tracking-wide transition-all shadow-[var(--shadow-4-strong)] hover:shadow-none hover:translate-x-[4px] hover:translate-y-[4px] ${
                                            copied 
                                            ? "bg-[var(--color-share-accent)] text-[var(--color-foreground)]" 
                                            : "bg-[var(--color-foreground)] text-[var(--color-background)]"
                                        }`}
                                    >
                                        {copied ? (
                                            <>
                                                <Check className="mr-2 h-6 w-6" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="mr-2 h-6 w-6" />
                                                Copy Link
                                            </>
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[var(--color-muted-foreground)] bg-[var(--color-muted)]/10 animate-in fade-in zoom-in-95 duration-300">
                                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-muted)]/20 text-[var(--color-muted-foreground)]">
                                        <Lock className="h-8 w-8" />
                                    </div>
                                    <h4 className="text-size-lg font-bold text-[var(--color-foreground)]">
                                        Sharing is disabled
                                    </h4>
                                    <p className="max-w-[240px] text-center text-size-sm font-medium text-[var(--color-muted-foreground)] mt-1">
                                        Toggle access above to generate a unique link for your friends.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}