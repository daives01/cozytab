export interface RewardPayload {
    nextRewardAt?: number;
    loginStreak?: number;
    lastDailyRewardDay?: string;
}

export interface DailyRewardToastPayload {
    awardedAt: number;
    loginStreak?: number;
}

export interface DailyRewardState extends RewardPayload {
    awardedAt?: number;
    wasAttempted: boolean;
}
