import { query, mutation } from "./_generated/server";

export const list = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("catalogItems").collect();
    },
});

export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        const existing = await ctx.db.query("catalogItems").collect();
        if (existing.length > 0) return "Already seeded";

        const items = [
            {
                name: "TV",
                category: "furniture",
                basePrice: 0,
                assetUrl: "https://placehold.co/100x100/333/fff?text=TV",
                defaultWidth: 100,
                defaultHeight: 100,
            },
            {
                name: "Plant",
                category: "decor",
                basePrice: 0,
                assetUrl: "https://placehold.co/60x100/2ecc71/fff?text=Plant",
                defaultWidth: 60,
                defaultHeight: 100,
            },
            {
                name: "Desk",
                category: "furniture",
                basePrice: 0,
                assetUrl: "https://placehold.co/150x80/e67e22/fff?text=Desk",
                defaultWidth: 150,
                defaultHeight: 80,
            },
        ];

        for (const item of items) {
            await ctx.db.insert("catalogItems", item);
        }

        return "Seeded " + items.length + " items";
    },
});
