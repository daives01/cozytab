export type CoinPack = {
    priceId: string;
    coins: number;
    label: string;
    priceLabel: string;
};

export type CoinPackIds = {
    price10: string;
    price50: string;
    price1000: string;
};

export function buildCoinPacks(ids: CoinPackIds) {
    const packs: CoinPack[] = [
        {
            priceId: ids.price10,
            coins: 10,
            label: "10 Cozy Coins",
            priceLabel: "$5",
        },
        {
            priceId: ids.price50,
            coins: 50,
            label: "50 Cozy Coins",
            priceLabel: "$20",
        },
        {
            priceId: ids.price1000,
            coins: 1000,
            label: "1000 Cozy Coins",
            priceLabel: "$50",
        },
    ];

    const priceToAmount: Record<string, number> = packs.reduce((acc, pack) => {
        acc[pack.priceId] = pack.coins;
        return acc;
    }, {} as Record<string, number>);

    return { packs, priceToAmount };
}

export function getCoinAmountForPriceId(priceId: string, priceToAmount: Record<string, number>): number | undefined {
    return priceToAmount[priceId];
}
