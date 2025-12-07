import { SignInButton } from "@clerk/clerk-react";
import { Lock, LockOpen, Share2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";

type RoomMode = "view" | "edit";

interface RoomToolbarProps {
    isGuest: boolean;
    mode: RoomMode;
    onToggleMode: () => void;
    shareAllowed: boolean;
    visitorCount: number;
    onShareClick: () => void;
    drawerOffset?: number;
    drawerOrientation?: "left" | "bottom";
}

export function RoomToolbar({
    isGuest,
    mode,
    onToggleMode,
    shareAllowed,
    visitorCount,
    onShareClick,
    drawerOffset = 0,
    drawerOrientation = "left",
}: RoomToolbarProps) {
    const circleBaseStyles =
        "relative h-14 w-14 rounded-full border-2 border-[var(--ink)] shadow-[var(--shadow-6)] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all flex items-center justify-center text-[var(--ink)] focus:outline-none focus-visible:ring-4 focus-visible:ring-[var(--ink)]/10";
    const leftSpacing = drawerOrientation === "left" ? 16 + drawerOffset : 16;
    const topSpacing = 16 + (drawerOrientation === "bottom" && drawerOffset > 0 ? 0 : 0);

    return (
        <div
            className="absolute top-4 flex gap-3 pointer-events-auto items-center transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
            style={{ zIndex: 50, left: `${leftSpacing}px`, top: `${topSpacing}px` }}
        >
            {isGuest && (
                <SignInButton mode="modal">
                    <Button size="lg" className="font-bold text-lg shadow-lg">
                        <LogIn className="mr-2 h-5 w-5" />
                        Log in to save
                    </Button>
                </SignInButton>
            )}

            <div className="relative group">
                <button
                    data-onboarding="mode-toggle"
                    onClick={onToggleMode}
                    className={`${circleBaseStyles} ${mode === "edit"
                        ? "bg-[var(--warning)] text-white"
                        : "bg-[var(--paper)]"
                    }`}
                    aria-label={mode === "view" ? "Enter edit mode" : "Exit edit mode"}
                >
                    {mode === "view" ? <Lock className="h-7 w-7" /> : <LockOpen className="h-7 w-7" />}
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[var(--ink)] text-white text-xs px-2 py-1 rounded-lg border-2 border-[var(--ink)] shadow-sm font-['Patrick_Hand'] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    {mode === "view" ? "Enter edit mode" : "Back to view"}
                </div>
            </div>

            <div className="relative group">
                {!shareAllowed ? (
                    <SignInButton mode="modal">
                        <button
                            className={`${circleBaseStyles} bg-[var(--paper-header)]`}
                            aria-label="Log in to share your room"
                        >
                            <Share2 className="h-7 w-7" />
                        </button>
                    </SignInButton>
                ) : (
                    <button
                        onClick={onShareClick}
                        className={`${circleBaseStyles} bg-[var(--paper-header)]`}
                        aria-label="Share your room"
                    >
                        {visitorCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-[var(--success-light)] text-[var(--ink)] text-xs font-bold rounded-full h-6 px-2 flex items-center justify-center border-2 border-[var(--ink)] shadow-[var(--shadow-2)]">
                                {visitorCount}
                            </span>
                        )}
                        <Share2 className="h-7 w-7" />
                    </button>
                )}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[var(--ink)] text-white text-xs px-2 py-1 rounded-lg border-2 border-[var(--ink)] shadow-sm font-['Patrick_Hand'] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    {!shareAllowed ? "Share (login required)" : "Share"}
                </div>
            </div>
        </div>
    );
}

