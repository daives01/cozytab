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
}

export function RoomToolbar({
    isGuest,
    mode,
    onToggleMode,
    shareAllowed,
    visitorCount,
    onShareClick,
}: RoomToolbarProps) {
    return (
        <div className="absolute top-4 left-4 flex gap-3 pointer-events-auto items-center" style={{ zIndex: 50 }}>
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
                    className={`
                        relative h-14 w-14 rounded-full border-2 shadow-md active:shadow-sm active:translate-x-[2px] active:translate-y-[2px] transition-all
                        flex items-center justify-center
                        ${mode === "view"
                            ? "bg-[var(--success)] border-[var(--ink)] text-white"
                            : "bg-[var(--warning)] border-[var(--ink)] text-[var(--ink)]"
                        }
                    `}
                >
                    {mode === "view" ? <Lock className="h-7 w-7" /> : <LockOpen className="h-7 w-7" />}
                </button>
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[var(--ink)] text-white text-xs px-2 py-1 rounded-lg border-2 border-[var(--ink)] shadow-sm font-['Patrick_Hand'] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    {mode === "view" ? "Edit" : "View"}
                </div>
            </div>

            <div className="relative group">
                {!shareAllowed ? (
                    <SignInButton mode="modal">
                        <button
                            className="relative h-14 w-14 rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] shadow-md active:shadow-sm active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center"
                        >
                            <Share2 className="h-7 w-7" />
                        </button>
                    </SignInButton>
                ) : (
                    <button
                        onClick={onShareClick}
                        className="relative h-14 w-14 rounded-full border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] shadow-md active:shadow-sm active:translate-x-[2px] active:translate-y-[2px] transition-all flex items-center justify-center"
                    >
                        <Share2 className="h-7 w-7" />
                        {visitorCount > 0 && (
                            <span className="absolute -top-1 -right-1 bg-[var(--success)] text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white shadow-sm">
                                {visitorCount}
                            </span>
                        )}
                    </button>
                )}
                <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-[var(--ink)] text-white text-xs px-2 py-1 rounded-lg border-2 border-[var(--ink)] shadow-sm font-['Patrick_Hand'] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                    {!shareAllowed ? "Share (login required)" : "Share"}
                </div>
            </div>
        </div>
    );
}

