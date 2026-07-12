import { useMemo } from "react";
import { canShare, canUseComputer } from "../utils/sessionGuards";
import { countIds } from "../utils/itemCounts";
import type { PlacementEligibility } from "../session";
import type { OnboardingStep } from "../Onboarding";
import type { Id, Doc } from "@convex/_generated/dataModel";

type UseRoomComputedArgs = {
    catalogItems: Doc<"catalogItems">[] | undefined;
    guestInventoryValue: Id<"catalogItems">[];
    placementEligibility: (catalogItemId: Id<"catalogItems">) => PlacementEligibility;
    userDisplayName?: string | null;
    userUsername?: string | null;
    clerkUsername?: string | null;
    displayNameValue: string | null;
    onboardingStep: OnboardingStep | null;
    timeOfDay: "day" | "night";
    overrideTimeOfDay: "day" | "night" | null;
    isGuest: boolean;
};

export function useRoomComputed({
    catalogItems,
    guestInventoryValue,
    placementEligibility,
    userDisplayName,
    userUsername,
    clerkUsername,
    displayNameValue,
    onboardingStep,
    timeOfDay,
    overrideTimeOfDay,
    isGuest,
}: UseRoomComputedArgs) {
    const computedDisplayName = useMemo(
        () => displayNameValue ?? userDisplayName ?? userUsername ?? clerkUsername ?? "You",
        [clerkUsername, displayNameValue, userDisplayName, userUsername]
    );

    const computedUsername = useMemo(() => userUsername ?? clerkUsername ?? "you", [clerkUsername, userUsername]);

    const guestDrawerItems = useMemo(() => {
        if (!catalogItems) return undefined;

        const inventoryCounts = countIds(guestInventoryValue);

        return Array.from(inventoryCounts.entries())
            .map(([idKey, total]) => {
                const item = catalogItems.find((c) => String(c._id) === idKey);
                if (!item) return null;
                const eligibility = placementEligibility(item._id);
                return {
                    inventoryId: idKey,
                    catalogItemId: item._id,
                    name: item.name,
                    assetUrl: item.assetUrl,
                    category: item.category,
                    hidden: false,
                    count: total,
                    remaining: eligibility.remaining,
                };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item));
    }, [catalogItems, guestInventoryValue, placementEligibility]);

    const shouldHighlightMusicPurchase = onboardingStep === "buy-item";
    const shareAllowed = canShare(isGuest);
    const computerGuard = canUseComputer(isGuest);

    return {
        computedDisplayName,
        computedUsername,
        guestDrawerItems,
        shouldHighlightMusicPurchase,
        shareAllowed,
        computerGuard,
        timeOfDay,
        overrideTimeOfDay,
    };
}
