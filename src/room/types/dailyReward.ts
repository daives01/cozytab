export interface RewardPayload {
    nextRewardAt: number | null;
    loginStreak: number | null;
    lastDailyRewardDay: string | null;
}

export interface DailyRewardToastPayload {
    awardedAt: number;
    loginStreak: number | null;
}

export interface DailyRewardState extends RewardPayload {
    awardedAt: number | null;
    wasAttempted: boolean;
}
