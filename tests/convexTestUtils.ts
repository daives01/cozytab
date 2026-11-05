import { convexTest } from "convex-test";
import schema from "@convex/schema";
import type { Id } from "@convex/_generated/dataModel";

const modules = {
    "@convex/_generated/api.js": () => import("@convex/_generated/api.js"),
    "@convex/_generated/server.js": () => import("@convex/_generated/server.js"),
    "@convex/users.ts": () => import("@convex/users"),
    "@convex/rooms.ts": () => import("@convex/rooms"),
    "@convex/invites.ts": () => import("@convex/invites"),
    "@convex/friends.ts": () => import("@convex/friends"),
    "@convex/guestConversion.ts": () => import("@convex/guestConversion"),
    "@convex/inventory.ts": () => import("@convex/inventory"),
    "@convex/catalog.ts": () => import("@convex/catalog"),
    "@convex/roomTemplates.ts": () => import("@convex/roomTemplates"),
};

export function createConvexTest() {
    return convexTest(schema, modules);
}

export function asUser<T extends ReturnType<typeof createConvexTest>>(t: T, subject: string) {
    return t.withIdentity({
        subject,
        tokenIdentifier: `test|${subject}`,
        issuer: "https://test.clerk.accounts.dev",
    });
}

export async function seedUser(t: ReturnType<typeof createConvexTest>, externalId: string, currency = 10) {
    return t.run((ctx) =>
        ctx.db.insert("users", {
            externalId,
            username: externalId,
            displayName: externalId,
            currency,
            referralCode: `REF-${externalId}`,
        }),
    );
}

export async function seedTemplate(t: ReturnType<typeof createConvexTest>, name = "Cozy Room", isDefault = true) {
    return t.run((ctx) =>
        ctx.db.insert("roomTemplates", {
            name,
            basePrice: 0,
            backgroundUrl: "/room.png",
            isDefault,
        }),
    );
}

export async function seedCatalogItem(
    t: ReturnType<typeof createConvexTest>,
    overrides: {
        name?: string;
        basePrice?: number;
        isStarterItem?: boolean;
    } = {},
) {
    return t.run((ctx) =>
        ctx.db.insert("catalogItems", {
            name: overrides.name ?? "Chair",
            category: "furniture",
            basePrice: overrides.basePrice ?? 2,
            assetUrl: "/chair.png",
            defaultWidth: 100,
            isStarterItem: overrides.isStarterItem,
        }),
    );
}

export async function seedRoom(
    t: ReturnType<typeof createConvexTest>,
    userId: Id<"users">,
    templateId: Id<"roomTemplates">,
    isActive = true,
    name = "Cozy Room",
) {
    return t.run((ctx) =>
        ctx.db.insert("rooms", {
            userId,
            templateId,
            name,
            isActive,
            items: [],
        }),
    );
}
