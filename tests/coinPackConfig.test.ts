import { afterEach, expect, test } from "bun:test";
import { getCoinPriceToAmount } from "@convex/lib/coinPackConfig";
import { getCoinAmountForPriceId } from "../shared/coinPacks";

const keys = ["STRIPE_PRICE_10_COINS", "STRIPE_PRICE_50_COINS", "STRIPE_PRICE_150_COINS", "STRIPE_PRICE_500_COINS"] as const;
const saved = keys.map(key => process.env[key]);
afterEach(() => {
    keys.forEach((key, index) => {
        if (saved[index] === undefined) delete process.env[key];
        else process.env[key] = saved[index];
    });
});

test("payment modules load without preview price configuration but payment validation fails", async () => {
    keys.forEach(key => delete process.env[key]);
    expect(await import("@convex/http")).toBeDefined();
    expect(await import("@convex/stripe")).toBeDefined();
    expect(getCoinPriceToAmount).toThrow("Missing required env STRIPE_PRICE_10_COINS");
});

test("payment configuration requires every pack and rejects blank prices", () => {
    keys.forEach((key, index) => { process.env[key] = `price_${index}`; });
    for (const key of keys) {
        const price = process.env[key];
        process.env[key] = "  ";
        expect(getCoinPriceToAmount).toThrow(`Missing required env ${key}`);
        process.env[key] = price;
    }
});

test("configured payment lookup preserves coin amounts and reads current configuration", () => {
    keys.forEach((key, index) => { process.env[key] = ` price_${index} `; });
    const prices = getCoinPriceToAmount();
    expect([0, 1, 2, 3].map(index => getCoinAmountForPriceId(`price_${index}`, prices))).toEqual([10, 50, 150, 500]);
    expect(getCoinAmountForPriceId("unconfigured_price", prices)).toBeUndefined();
    process.env.STRIPE_PRICE_10_COINS = "price_replaced";
    expect(getCoinAmountForPriceId("price_replaced", getCoinPriceToAmount())).toBe(10);
    expect(getCoinAmountForPriceId("price_0", getCoinPriceToAmount())).toBeUndefined();
});
