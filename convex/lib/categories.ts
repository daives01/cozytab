import { v } from "convex/values";

export { CATALOG_ITEM_CATEGORIES, GAME_TYPES } from "@shared/categories";

export type { CatalogItemCategory, GameType } from "@shared/categories";

/** Convex validator for catalog item category field (source of truth). */
export const catalogItemCategoryValidator = v.union(
    v.literal("music"),
    v.literal("decor"),
    v.literal("furniture"),
    v.literal("computers"),
    v.literal("games"),
);

/** Convex validator for game type field. */
export const gameTypeValidator = v.union(v.literal("chess"));
