import type { OnboardingStep } from "./Onboarding";

// Helper to determine the next step
// Note: "open-storage" is skipped because drawer opens automatically when entering edit mode
export function getNextStep(currentStep: OnboardingStep): OnboardingStep {
    const order: OnboardingStep[] = [
        "welcome",
        "enter-edit-mode",
        // "open-storage" - skipped, drawer opens automatically
        "place-computer",
        "switch-to-view",
        "click-computer",
        "open-shop",
        "buy-item",
        "complete",
    ];

    const currentIndex = order.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex >= order.length - 1) {
        return "complete";
    }
    return order[currentIndex + 1];
}

