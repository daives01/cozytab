import { buildCoinPacks, getCoinAmountForPriceId } from "../shared/coinPacks";

describe("coin purchase configuration", () => {
    const ENV_10 = "price_10_test";
    const ENV_50 = "price_50_test";
    const ENV_150 = "price_150_test";
    const ENV_500 = "price_500_test";

    const { packs, priceToAmount } = buildCoinPacks({
        price10: ENV_10,
        price50: ENV_50,
        price150: ENV_150,
        price500: ENV_500,
    });

    it("exposes each CoinPack with an expected price entry", () => {
        expect(packs.map((pack) => pack.priceId)).toEqual([ENV_10, ENV_50, ENV_150, ENV_500]);
    });

    it("resolves the correct coin amounts", () => {
        expect(getCoinAmountForPriceId(ENV_10, priceToAmount)).toBe(10);
        expect(getCoinAmountForPriceId(ENV_50, priceToAmount)).toBe(50);
        expect(getCoinAmountForPriceId(ENV_150, priceToAmount)).toBe(150);
        expect(getCoinAmountForPriceId(ENV_500, priceToAmount)).toBe(500);
    });

    it("returns undefined for unknown prices", () => {
        expect(getCoinAmountForPriceId("price_unknown", priceToAmount)).toBeUndefined();
    });
});
