import { useState, useEffect } from "react";

interface UseDailyRewardOptions {
    user: { _id: string } | null | undefined;
    isGuest: boolean;
    claimDailyReward: () => Promise<{ success: boolean }>;
}

export function useDailyReward({ user, isGuest, claimDailyReward }: UseDailyRewardOptions) {
    const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);

    useEffect(() => {
        if (!isGuest && user && !dailyRewardClaimed) {
            claimDailyReward()
                .then(() => {
                    setDailyRewardClaimed(true);
                    // We silently claim the reward and let the UI display status elsewhere.
                })
                .catch(() => {
                    setDailyRewardClaimed(true);
                });
        }
    }, [user, isGuest, dailyRewardClaimed, claimDailyReward]);

    return null;
}

