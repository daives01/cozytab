import { useMemo } from "react";
import { STARTER_COMPUTER_NAME } from "../../../shared/guestTypes";
import { canShare, canUseComputer } from "../utils/sessionGuards";
import type { OnboardingStep } from "../Onboarding";

type UseRoomComputedArgs = {
    catalogItems: { _id?: string; name?: string; assetUrl: string; category: string }[] | undefined;
    guestInventoryValue: string[];
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
        const uniqueInventoryIds = Array.from(new Set<string>([...guestInventoryValue, STARTER_COMPUTER_NAME]));

        return uniqueInventoryIds
            .map((id) => catalogItems.find((c) => c._id === id || c.name === id))
            .filter((item): item is (typeof catalogItems)[number] => Boolean(item))
            .map((item) => ({
                inventoryId: `guest-${item._id ?? item.name ?? STARTER_COMPUTER_NAME}`,
                catalogItemId: item.name ?? STARTER_COMPUTER_NAME,
                name: item.name ?? STARTER_COMPUTER_NAME,
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

