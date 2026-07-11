import { v } from "convex/values";

export const shortcutValidator = v.object({
    id: v.string(),
    name: v.string(),
    url: v.string(),
    row: v.number(),
    col: v.number(),
});

export const roomItemValidator = v.object({
    id: v.string(),
    catalogItemId: v.id("catalogItems"),
    x: v.number(),
    y: v.number(),
    url: v.optional(v.string()),
    flipped: v.optional(v.boolean()),
    musicUrl: v.optional(v.string()),
    musicType: v.optional(v.literal("youtube")),
    musicPlaying: v.optional(v.boolean()),
    musicStartedAt: v.optional(v.number()),
    musicPositionAtStart: v.optional(v.number()),
});

export const roomTemplateDocumentValidator = v.object({
    _id: v.id("roomTemplates"),
    _creationTime: v.number(),
    name: v.string(),
    description: v.optional(v.string()),
    basePrice: v.number(),
    backgroundUrl: v.string(),
    isDefault: v.boolean(),
});

export const roomDocumentValidator = v.object({
    _id: v.id("rooms"),
    _creationTime: v.number(),
    userId: v.id("users"),
    templateId: v.id("roomTemplates"),
    name: v.string(),
    isActive: v.boolean(),
    items: v.array(roomItemValidator),
});

export const roomWithTemplateValidator = v.object({
    _id: v.id("rooms"),
    _creationTime: v.number(),
    userId: v.id("users"),
    templateId: v.id("roomTemplates"),
    name: v.string(),
    isActive: v.boolean(),
    items: v.array(roomItemValidator),
    template: v.union(roomTemplateDocumentValidator, v.null()),
});
