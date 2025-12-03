import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { OnboardingSpotlight } from "./OnboardingSpotlight";

export type OnboardingStep =
    | "welcome"
    | "enter-edit-mode"
    | "open-storage"
    | "place-computer"
    | "switch-to-view"
    | "click-computer"
    | "open-shop"
    | "buy-item"
    | "complete";

interface OnboardingProps {
    currentStep: OnboardingStep;
    onComplete: () => void;
}

interface StepConfig {
    message: string;
    targetSelector?: string;
    bubblePosition: "top" | "bottom" | "left" | "right";
    showSkip: boolean;
    pulseTarget: boolean;
}

const stepConfigs: Record<OnboardingStep, StepConfig> = {
    welcome: {
        message: "Welcome to your nook! 🏠 This is your cozy corner of the internet. Let me show you around!",
        bubblePosition: "bottom",
        showSkip: true,
        pulseTarget: false,
    },
    "enter-edit-mode": {
        message: "First, let's unlock your room so you can decorate! Click the lock button to enter Edit Mode.",
        targetSelector: "[data-onboarding='mode-toggle']",
        bubblePosition: "right",
        showSkip: true,
        pulseTarget: true,
    },
    "open-storage": {
        message: "Great! Now let's open your storage. Click the drawer tab to see your items.",
        targetSelector: "[data-onboarding='drawer-toggle']",
        bubblePosition: "left",
        showSkip: true,
        pulseTarget: true,
    },
    "place-computer": {
        message: "You have a Computer in your storage! Drag it onto your room to place it.",
        targetSelector: "[data-onboarding='storage-item-computer']",
        bubblePosition: "left",
        showSkip: true,
        pulseTarget: true,
    },
    "switch-to-view": {
        message: "Nice! Now lock your room to interact with your items. Click the lock button again.",
        targetSelector: "[data-onboarding='mode-toggle']",
        bubblePosition: "right",
        showSkip: true,
        pulseTarget: true,
    },
    "click-computer": {
        message: "Click on your computer to open it!",
        targetSelector: "[data-onboarding='placed-computer']",
        bubblePosition: "bottom",
        showSkip: true,
        pulseTarget: true,
    },
    "open-shop": {
        message: "Click on the Item Shop to browse and buy new decorations!",
        targetSelector: "[data-onboarding='shop-icon']",
        bubblePosition: "bottom",
        showSkip: true,
        pulseTarget: true,
    },
    "buy-item": {
        message: "Use your tokens to buy items! Try buying something you like. You earn more tokens each day you visit!",
        targetSelector: "[data-onboarding='shop-item']",
        bubblePosition: "left",
        showSkip: true,
        pulseTarget: true,
    },
    complete: {
        message: "You're all set! Enjoy decorating your nook! 🎉",
        bubblePosition: "bottom",
        showSkip: false,
        pulseTarget: false,
    },
};

export function Onboarding({ currentStep, onComplete }: OnboardingProps) {
    const completeOnboarding = useMutation(api.users.completeOnboarding);

    const handleSkip = async () => {
        await completeOnboarding();
        onComplete();
    };

    if (currentStep === "complete") {
        return (
            <OnboardingSpotlight
                message={stepConfigs.complete.message}
                bubblePosition={stepConfigs.complete.bubblePosition}
                onSkip={handleSkip}
                showSkip={false}
                pulseTarget={false}
            />
        );
    }

    const config = stepConfigs[currentStep];

    return (
        <OnboardingSpotlight
            targetSelector={config.targetSelector}
            message={config.message}
            bubblePosition={config.bubblePosition}
            onSkip={handleSkip}
            showSkip={config.showSkip}
            pulseTarget={config.pulseTarget}
        />
    );
}


