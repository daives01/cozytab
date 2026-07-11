export const CATALOG_ITEM_CATEGORIES = ["music", "decor", "furniture", "computers", "games"] as const;
export type CatalogItemCategory = (typeof CATALOG_ITEM_CATEGORIES)[number];

export const GAME_TYPES = ["chess"] as const;
export type GameType = (typeof GAME_TYPES)[number];
