import { X, UserPlus, Gift, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InvitePanelProps {
    referralUrl: string | null;
    copied: boolean;
    onClose: () => void;
    onCopyReferral: () => void;
}

export function InvitePanel({ referralUrl, copied, onClose, onCopyReferral }: InvitePanelProps) {
    return (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            <div className="bg-stone-100 rounded-lg shadow-xl border-2 border-stone-300 w-80 overflow-hidden">
                <div className="bg-gradient-to-r from-pink-600 to-pink-500 text-white p-1 px-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        <span className="font-bold text-sm">Invite Friends</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="bg-stone-200 text-black hover:bg-red-500 hover:text-white transition-colors p-0.5 rounded-sm border border-stone-400 w-5 h-5 flex items-center justify-center"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    <div className="flex items-center gap-2 text-stone-700 text-sm">
                        <Gift className="h-5 w-5 text-pink-500" />
                        <span>Earn <strong>1 token</strong> when friends join!</span>
                    </div>

                    {referralUrl ? (
                        <div className="space-y-2">
                            <div className="text-xs text-stone-500 font-medium">Your invite link:</div>
                            <div className="flex gap-2">
                                <Input
                                    readOnly
                                    value={referralUrl}
                                    className="h-8 text-xs bg-white font-mono border-stone-400 flex-1"
                                />
                                <Button
                                    size="sm"
                                    onClick={onCopyReferral}
                                    className={`h-8 px-3 transition-colors ${
                                        copied
                                            ? "bg-green-600 hover:bg-green-600"
                                            : "bg-pink-600 hover:bg-pink-500"
                                    }`}
                                >
                                    {copied ? (
                                        <Check className="h-4 w-4" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {copied && (
                                <div className="text-xs text-green-600 font-medium">
                                    Copied to clipboard!
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-sm text-stone-500">Loading...</div>
                    )}
                </div>
            </div>
        </div>
    );
}

