import { useMemo } from "react";
import { canShare, canUseComputer } from "../utils/sessionGuards";
import type { OnboardingStep } from "../Onboarding";
import type { Id, Doc } from "../../../convex/_generated/dataModel";

type UseRoomComputedArgs = {
    catalogItems: Doc<"catalogItems">[] | undefined;
    guestInventoryValue: Id<"catalogItems">[];
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
        const uniqueInventoryIds = Array.from(new Set<Id<"catalogItems">>(guestInventoryValue));

        return uniqueInventoryIds
            .map((id) => catalogItems.find((c) => c._id === id))
            .filter((item): item is (typeof catalogItems)[number] => Boolean(item))
            .map((item) => ({
                inventoryId: item._id,
                catalogItemId: item._id,
                name: item.name,
                assetUrl: item.assetUrl,
                category: item.category,
                hidden: false,
            }));
    }, [catalogItems, guestInventoryValue]);

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

