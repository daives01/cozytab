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
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className="bg-[#f5f0e6] rounded-2xl shadow-2xl w-full max-w-md mx-4 border-4 border-[#d4c4a8] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Share2 className="h-6 w-6 text-white" />
                        <h2 className="text-2xl font-bold text-white">Share Your Room</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white transition-colors"
                    >
                        <X className="h-6 w-6" />
                </button>
            </div>

            <div className="p-6 space-y-6">
                {visitorCount > 0 && (
                        <div className="flex items-center gap-3 p-3 bg-emerald-100 rounded-xl border-2 border-emerald-300">
                            <Users className="h-5 w-5 text-emerald-600" />
                            <span className="text-emerald-800 font-medium">
                                {visitorCount} {visitorCount === 1 ? "visitor" : "visitors"} in your room right now
                            </span>
                        </div>
                    )}

                    {shareUrl ? (
                        <div className="space-y-4">
                            <p className="text-gray-600">
                                Share this link with friends to let them visit your room:
                            </p>

                            <div className="flex gap-2">
                                <Input
                                    value={shareUrl}
                                    readOnly
                                    className="bg-white font-mono text-sm"
                                />
                                <Button
                                    onClick={handleCopyLink}
                                    className={`shrink-0 ${
                                        copied
                                            ? "bg-emerald-500 hover:bg-emerald-600"
                                            : "bg-indigo-500 hover:bg-indigo-600"
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

                            <Button
                                variant="outline"
                                onClick={handleRevokeLink}
                                className="w-full border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Revoke Link
                            </Button>

                            <p className="text-sm text-gray-500 text-center">
                                Revoking the link will disconnect all current visitors
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="text-center py-6">
                                <Link2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                                <p className="text-gray-600 mb-4">
                                    Generate a shareable link to let friends visit your room in real-time
                                </p>
                            </div>

                            <Button
                                onClick={handleCreateLink}
                                disabled={isCreating}
                                className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-lg py-6"
                            >
                                {isCreating ? (
                                    "Creating..."
                                ) : (
                                    <>
                                        <Link2 className="h-5 w-5 mr-2" />
                                        Generate Share Link
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

