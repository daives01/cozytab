import { useState, useEffect } from "react";
import type { DailyRewardState, DailyRewardToastPayload } from "../types/dailyReward";

interface UseDailyRewardOptions {
    user: { _id: string; loginStreak?: number | null; nextRewardAt?: number | null } | null | undefined;
    isGuest: boolean;
    claimDailyReward: () => Promise<{
        success: boolean;
        nextRewardAt?: number | null;
        loginStreak?: number | null;
        lastDailyRewardDay?: string | null;
        newBalance?: number;
        message?: string;
    }>;
    onReward?: (info: DailyRewardToastPayload & { nextRewardAt: number | null }) => void;
}

export function useDailyReward({ user, isGuest, claimDailyReward, onReward }: UseDailyRewardOptions) {
    const userLoginStreak = (user as { loginStreak?: number } | undefined)?.loginStreak ?? null;
    const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
    const [rewardInfo, setRewardInfo] = useState<DailyRewardState>({
        awardedAt: null,
        nextRewardAt: (user as { nextRewardAt?: number | null } | undefined)?.nextRewardAt ?? null,
        loginStreak: userLoginStreak,
        wasAttempted: false,
        lastDailyRewardDay: null,
    });

    useEffect(() => {
        if (!isGuest && user && !dailyRewardClaimed) {
            claimDailyReward()
                .then((result) => {
                    const awardedAt = result.success ? Date.now() : null;
                    setRewardInfo((prev) => ({
                        ...prev,
                        awardedAt: awardedAt ?? prev.awardedAt,
                        nextRewardAt: result.nextRewardAt ?? prev.nextRewardAt,
                        loginStreak:
                            (result.loginStreak as number | null | undefined) ??
                            (user as { loginStreak?: number } | undefined)?.loginStreak ??
                            prev.loginStreak,
                        lastDailyRewardDay: result.lastDailyRewardDay ?? prev.lastDailyRewardDay,
                        wasAttempted: true,
                    }));
                    if (result.success) {
                        onReward?.({
                            awardedAt: awardedAt ?? Date.now(),
                            loginStreak:
                                (result.loginStreak as number | null | undefined) ??
                                (user as { loginStreak?: number } | undefined)?.loginStreak ??
                                null,
                            nextRewardAt: result.nextRewardAt ?? null,
                        });
                    }
                    setDailyRewardClaimed(true);
                })
                .catch(() => {
                    setRewardInfo((prev) => ({ ...prev, wasAttempted: true }));
                    setDailyRewardClaimed(true);
                });
        }
    }, [user, isGuest, dailyRewardClaimed, claimDailyReward, onReward, userLoginStreak]);

    return rewardInfo;
}

