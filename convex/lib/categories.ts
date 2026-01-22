import { v, type Infer } from "convex/values";

/** Convex validator for catalog item category field (source of truth). */
export const catalogItemCategoryValidator = v.union(
    v.literal("music"),
    v.literal("decor"),
    v.literal("furniture"),
    v.literal("computers"),
    v.literal("games")
);

/** TypeScript type derived from the validator. */
export type CatalogItemCategory = Infer<typeof catalogItemCategoryValidator>;

/** Array of all valid categories for iteration. */
export const CATALOG_ITEM_CATEGORIES: readonly CatalogItemCategory[] = ["music", "decor", "furniture", "computers", "games"];
