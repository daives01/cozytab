import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getMe = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();
        return user;
    },
});

export const isAdmin = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return false;

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        return user?.admin === true;
    },
});

export const getMyReferralCode = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        return user?.referralCode ?? null;
    },
});

// Generate a short, readable referral code
function generateReferralCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Exclude confusing chars like 0/O, 1/I
    let code = "";
    for (let i = 0; i < 8; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export const ensureUser = mutation({
    args: {
        username: v.string(),
        referralCode: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        // Prefer Clerk-provided username; fall back to name/email/caller-provided value
        const clerkUsername =
            typeof identity.username === "string" ? identity.username : undefined;
        const clerkName = typeof identity.name === "string" ? identity.name : undefined;
        const tokenIdentifier =
            typeof identity.tokenIdentifier === "string"
                ? identity.tokenIdentifier
                : undefined;
        const derivedUsername =
            clerkUsername ??
            clerkName ??
            // Some providers map the identifier into the tokenIdentifier (e.g., email)
            tokenIdentifier?.split(":").pop() ??
            args.username;
        const derivedDisplayName = clerkName ?? derivedUsername;

        let user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        if (!user) {
            let referrerId = undefined;
            const providedReferralCode = args.referralCode;
            if (providedReferralCode) {
                const referrer = await ctx.db
                    .query("users")
                    .withIndex("by_referralCode", (q) =>
                        q.eq("referralCode", providedReferralCode)
                    )
                    .unique();

                if (referrer) {
                    referrerId = referrer._id;
                    await ctx.db.patch(referrer._id, {
                        currency: referrer.currency + 1,
                    });
                }
            }

            let newReferralCode = generateReferralCode();
            let existingCode = await ctx.db
                .query("users")
                .withIndex("by_referralCode", (q) =>
                    q.eq("referralCode", newReferralCode)
                )
                .unique();
            while (existingCode) {
                newReferralCode = generateReferralCode();
                existingCode = await ctx.db
                    .query("users")
                    .withIndex("by_referralCode", (q) =>
                        q.eq("referralCode", newReferralCode)
                    )
                    .unique();
            }

            const id = await ctx.db.insert("users", {
                externalId: identity.subject,
                username: derivedUsername,
                displayName: derivedDisplayName,
                currency: 5,
                computer: {
                    shortcuts: [],
                },
                onboardingCompleted: false,
                referralCode: newReferralCode,
                referredBy: referrerId,
            });
            user = await ctx.db.get(id);

            if (user) {
                const starterItem = await ctx.db
                    .query("catalogItems")
                    .withIndex("by_name", (q) => q.eq("name", "Computer"))
                    .unique();

                if (starterItem) {
                    await ctx.db.insert("inventory", {
                        userId: user._id,
                        catalogItemId: starterItem._id,
                        purchasedAt: Date.now(),
                    });
                }
            }
        }

        return user;
    },
});

export const completeOnboarding = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        if (!user) throw new Error("User not found");

        await ctx.db.patch(user._id, {
            onboardingCompleted: true,
        });

        return { success: true };
    },
});

export const claimDailyReward = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        if (!user) throw new Error("User not found");

        const now = Date.now();
        const lastReward = user.lastDailyReward ?? 0;
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (now - lastReward < oneDayMs) {
            return { success: false, message: "Daily reward already claimed" };
        }

        await ctx.db.patch(user._id, {
            currency: user.currency + 1,
            lastDailyReward: now,
        });

        return { success: true, newBalance: user.currency + 1 };
    },
});

const GRID_COLUMNS = 6;

function normalizeShortcutsWithGrid<
    T extends {
        id: string;
        name: string;
        url: string;
        row?: number;
        col?: number;
        type?: "user" | "system";
    }
>(shortcuts: T[]) {
    const occupied = new Set<string>();

    const clamp = (value: number) => Math.max(0, Math.round(value));

    return shortcuts.map((shortcut, index) => {
        let row =
            typeof shortcut.row === "number" && !Number.isNaN(shortcut.row)
                ? clamp(shortcut.row)
                : Math.floor(index / GRID_COLUMNS);
        let col =
            typeof shortcut.col === "number" && !Number.isNaN(shortcut.col)
                ? clamp(shortcut.col)
                : index % GRID_COLUMNS;

        // Resolve collisions by walking forward in row-major order
        while (occupied.has(`${row}-${col}`)) {
            col++;
            if (col >= GRID_COLUMNS) {
                col = 0;
                row++;
            }
        }
        occupied.add(`${row}-${col}`);

        return {
            ...shortcut,
            row,
            col,
            type: shortcut.type ?? "user",
        };
    });
}

export const getMyComputer = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        if (!user) return null;

        // If user has computer state, ensure it has grid positions
        if (user.computer) {
            const needsNormalization = user.computer.shortcuts.some(
                (shortcut) =>
                    typeof shortcut.row !== "number" ||
                    typeof shortcut.col !== "number"
            );

            if (needsNormalization) {
                const normalized = normalizeShortcutsWithGrid(
                    user.computer.shortcuts
                );
                return { shortcuts: normalized };
            }

            return user.computer;
        }

        // Migrate from the active room shortcuts if present
        const rooms = await ctx.db
            .query("rooms")
            .withIndex("by_user_active", (q) =>
                q.eq("userId", user._id).eq("isActive", true)
            )
            .collect();
        const activeRoom = rooms[0];
        const migrated =
            activeRoom?.shortcuts && activeRoom.shortcuts.length > 0
                ? normalizeShortcutsWithGrid(activeRoom.shortcuts)
                : [];

        const computerState = { shortcuts: migrated };

        return computerState;
    },
});

export const saveMyComputer = mutation({
    args: {
        shortcuts: v.array(
            v.object({
                id: v.string(),
                name: v.string(),
                url: v.string(),
                row: v.number(),
                col: v.number(),
                type: v.optional(
                    v.union(v.literal("user"), v.literal("system"))
                ),
            })
        ),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const user = await ctx.db
            .query("users")
            .withIndex("by_externalId", (q) =>
                q.eq("externalId", identity.subject)
            )
            .unique();

        if (!user) throw new Error("User not found");

        const normalized = normalizeShortcutsWithGrid(args.shortcuts);

        await ctx.db.patch(user._id, {
            computer: { shortcuts: normalized },
        });

        return { success: true };
    },
});
