import type { OnboardingStep } from "./Onboarding";

export function getNextStep(currentStep: OnboardingStep): OnboardingStep {
    const order: OnboardingStep[] = [
        "welcome",
        "enter-edit-mode",
        "place-computer",
        "switch-to-view",
        "click-computer",
        "add-shortcut",
        "open-shop",
        "buy-item",
        "set-homepage",
        "complete",
    ];

    const currentIndex = order.indexOf(currentStep);
    if (currentIndex === -1 || currentIndex >= order.length - 1) {
        return "complete";
    }
    return order[currentIndex + 1];
}

