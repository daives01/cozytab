import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

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
            await ctx.db.patch(existing._id, { fen: STARTING_FEN, lastMove: undefined });
        } else {
            await ctx.db.insert("chessBoardStates", { itemId, fen: STARTING_FEN });
        }
    },
});
