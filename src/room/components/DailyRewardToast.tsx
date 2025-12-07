import type { DailyRewardToastPayload } from "../types/dailyReward";
import { Coins, Flame } from "lucide-react";

interface DailyRewardToastProps {
    toast: DailyRewardToastPayload;
}

export function DailyRewardToast({ toast }: DailyRewardToastProps) {
    return (
        <div className="absolute top-6 right-6 z-[120] pointer-events-none animate-in slide-in-from-right fade-in duration-300">
            <div className="pointer-events-auto flex w-full max-w-xs items-center gap-3 rounded-2xl border-2 border-[var(--ink)] bg-[var(--card)] p-3 shadow-[var(--shadow-ink-strong)]">
                
                {/* Icon Box */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--ink)] bg-[var(--paper-header)] text-[var(--ink)]">
                    <Coins className="h-5 w-5" />
                </div>

                {/* Content */}
                <div className="flex flex-col">
                    <span className="text-sm font-bold leading-tight text-[var(--ink)]">
                        Cozy coin collected!
                    </span>
                    <div className="mt-0.5 flex items-center gap-1.5">
                        <Flame className="h-3 w-3 fill-[var(--warning)] text-[var(--warning-dark)]" />
                        <span className="text-xs font-bold uppercase tracking-wide text-[var(--ink-subtle)]">
                            {toast.loginStreak ?? 1} Day Streak
                        </span>
                    </div>
                </div>

            </div>
        </div>
    );
}