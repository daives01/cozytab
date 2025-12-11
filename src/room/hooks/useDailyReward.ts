import { useState, useEffect } from "react";
import type { Doc } from "@convex/_generated/dataModel";
import type { DailyRewardState, DailyRewardToastPayload } from "../types/dailyReward";

interface UseDailyRewardOptions {
    user: Doc<"users"> | null | undefined;
    isGuest: boolean;
    claimDailyReward: () => Promise<{
        success: boolean;
        nextRewardAt?: number;
        loginStreak?: number;
        lastDailyRewardDay?: string;
        newBalance?: number;
        message?: string;
    }>;
    onReward?: (info: DailyRewardToastPayload & { nextRewardAt?: number }) => void;
}

export function useDailyReward({ user, isGuest, claimDailyReward, onReward }: UseDailyRewardOptions) {
    const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
    const [rewardInfo, setRewardInfo] = useState<DailyRewardState>({
        awardedAt: undefined,
        nextRewardAt: undefined,
        loginStreak: user?.loginStreak,
        wasAttempted: false,
        lastDailyRewardDay: user?.lastDailyRewardDay,
    });

    useEffect(() => {
        if (isGuest || !user || dailyRewardClaimed) return;

        claimDailyReward()
            .then((result) => {
                const awardedAt = result.success ? Date.now() : undefined;
                setRewardInfo((prev) => ({
                    ...prev,
                    awardedAt: awardedAt ?? prev.awardedAt,
                    nextRewardAt: result.nextRewardAt ?? prev.nextRewardAt,
                    loginStreak: result.loginStreak ?? user.loginStreak ?? prev.loginStreak,
                    lastDailyRewardDay: result.lastDailyRewardDay ?? prev.lastDailyRewardDay,
                    wasAttempted: true,
                }));
                if (result.success) {
                    onReward?.({
                        awardedAt: awardedAt ?? Date.now(),
                        loginStreak: result.loginStreak ?? user.loginStreak ?? undefined,
                        nextRewardAt: result.nextRewardAt,
                    });
                }
                setDailyRewardClaimed(true);
            })
            .catch(() => {
                setRewardInfo((prev) => ({ ...prev, wasAttempted: true }));
                setDailyRewardClaimed(true);
            });
    }, [user, isGuest, dailyRewardClaimed, claimDailyReward, onReward]);

    return rewardInfo;
}

