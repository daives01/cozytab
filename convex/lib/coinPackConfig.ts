import { buildCoinPacks } from "../../shared/coinPacks";

function requireEnv(key: string, label: string): string {
    const value = process.env[key];
    if (!value || !value.trim()) {
        throw new Error(`Missing required env ${key} for ${label}`);
    }
    return value.trim();
}

// Validate at the payment boundary so previews can load without billing configured.
export function getCoinPriceToAmount() {
    return buildCoinPacks({
        price10: requireEnv("STRIPE_PRICE_10_COINS", "10 coin pack"),
        price50: requireEnv("STRIPE_PRICE_50_COINS", "50 coin pack"),
        price150: requireEnv("STRIPE_PRICE_150_COINS", "150 coin pack"),
        price500: requireEnv("STRIPE_PRICE_500_COINS", "500 coin pack"),
    }).priceToAmount;
}
