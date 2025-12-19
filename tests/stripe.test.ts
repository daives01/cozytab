import { buildCoinPacks, getCoinAmountForPriceId } from "../shared/coinPacks";

describe("coin purchase configuration", () => {
    const ENV_10 = "price_10_test";
    const ENV_50 = "price_50_test";
    const ENV_1000 = "price_1000_test";

    const { packs, priceToAmount } = buildCoinPacks({
        price10: ENV_10,
        price50: ENV_50,
        price1000: ENV_1000,
    });

    it("exposes each CoinPack with an expected price entry", () => {
        expect(packs.map((pack) => pack.priceId)).toEqual([ENV_10, ENV_50, ENV_1000]);
    });

    it("resolves the correct coin amounts", () => {
        expect(getCoinAmountForPriceId(ENV_10, priceToAmount)).toBe(10);
        expect(getCoinAmountForPriceId(ENV_50, priceToAmount)).toBe(50);
        expect(getCoinAmountForPriceId(ENV_1000, priceToAmount)).toBe(1000);
    });

    it("returns undefined for unknown prices", () => {
        expect(getCoinAmountForPriceId("price_unknown", priceToAmount)).toBeUndefined();
    });
});
