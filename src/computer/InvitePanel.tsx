import { Gift, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface InvitePanelProps {
    referralUrl: string | null;
    copied: boolean;
    onCopyReferral: () => void;
    isGuest?: boolean;
}

export function InvitePanel({
    referralUrl,
    copied,
    onCopyReferral,
    isGuest = false,
}: InvitePanelProps) {
    const baseContainerClass =
        "bg-stone-50 w-full h-full overflow-hidden flex flex-col";

    const container = (
        <div className={baseContainerClass}>
            <div className="p-4 space-y-4">
                <div className="flex items-center gap-2 text-stone-700 text-size-lg">
                    <Gift className="h-5 w-5 text-pink-500" />
                    <span>Earn <strong>3 cozy coins</strong> when friends join!</span>
                </div>

                {isGuest ? (
                    <div className="text-sm text-stone-600 font-medium">
                        Log in to invite friends!
                    </div>
                ) : referralUrl ? (
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
    );

    return <div className="w-full h-full">{container}</div>;
}

