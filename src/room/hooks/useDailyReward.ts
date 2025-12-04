import { useState, useEffect } from "react";

interface UseDailyRewardOptions {
    user: { _id: string } | null | undefined;
    isGuest: boolean;
    claimDailyReward: () => Promise<{ success: boolean }>;
}

export function useDailyReward({ user, isGuest, claimDailyReward }: UseDailyRewardOptions) {
    const [dailyRewardClaimed, setDailyRewardClaimed] = useState(false);
    const [showRewardNotification, setShowRewardNotification] = useState(false);

    useEffect(() => {
        if (!isGuest && user && !dailyRewardClaimed) {
            claimDailyReward()
                .then((result: { success: boolean }) => {
                    setDailyRewardClaimed(true);
                    if (result.success) {
                        setShowRewardNotification(true);
                        setTimeout(() => setShowRewardNotification(false), 4000);
                    }
                })
                .catch(() => {
                    setDailyRewardClaimed(true);
                });
        }
    }, [user, isGuest, dailyRewardClaimed, claimDailyReward]);

    return {
        showRewardNotification,
        setShowRewardNotification,
    };
}

