import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { STARTING_FEN } from "../shared/gameTypes";

export const getChessBoardState = query({
    args: { itemId: v.string() },
    handler: async (ctx, { itemId }) => {
        return await ctx.db
            .query("chessBoardStates")
            .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
            .first();
    },
});

export const makeChessMove = mutation({
    args: {
        itemId: v.string(),
        fen: v.string(),
        lastMove: v.object({ from: v.string(), to: v.string() }),
    },
    handler: async (ctx, { itemId, fen, lastMove }) => {
        const existing = await ctx.db
            .query("chessBoardStates")
            .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, { fen, lastMove });
        } else {
            await ctx.db.insert("chessBoardStates", { itemId, fen, lastMove });
        }
    },
});

export const resetChessBoard = mutation({
    args: { itemId: v.string() },
    handler: async (ctx, { itemId }) => {
        const existing = await ctx.db
            .query("chessBoardStates")
            .withIndex("by_itemId", (q) => q.eq("itemId", itemId))
            .first();

        if (existing) {
            await ctx.db.replace(existing._id, { itemId, fen: STARTING_FEN });
        } else {
            await ctx.db.insert("chessBoardStates", { itemId, fen: STARTING_FEN });
        }
    },
});
