import { Coins, Flame } from "lucide-react";

import type { DailyRewardToastPayload } from "../types";
import { Toast } from "@/components/ui/toast";

interface DailyRewardToastProps {
  toast: DailyRewardToastPayload;
}

export function DailyRewardToast({ toast }: DailyRewardToastProps) {
  return (
    <Toast
      tone="success"
      icon={<Coins className="h-5 w-5" />}
      title="Cozy coin collected!"
    >
      <div className="flex items-center gap-1.5 text-[var(--ink-subtle)]">
        <Flame className="h-3 w-3 fill-[var(--warning)] text-[var(--warning-dark)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em]">
          {toast.loginStreak ?? 1} Day Streak
        </span>
      </div>
    </Toast>
  );
}