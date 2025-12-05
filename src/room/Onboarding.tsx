import { OnboardingSpotlight } from "./OnboardingSpotlight";

export type OnboardingStep =
    | "welcome"
    | "enter-edit-mode"
    | "place-computer"
    | "switch-to-view"
    | "click-computer"
    | "add-shortcut"
    | "open-shop"
    | "buy-item"
    | "set-homepage"
    | "complete";

interface OnboardingProps {
    currentStep: OnboardingStep;
    onComplete: () => void;
    onNext?: () => void;
    onSkip?: () => void;
    isGuest?: boolean;
}

interface StepConfig {
    message: string;
    targetSelector?: string;
    bubblePosition: "top" | "bottom" | "left" | "right";
    fixedBubblePosition?: Partial<Record<"top" | "left" | "right" | "bottom", number>>;
    showSkip: boolean;
    pulseTarget: boolean;
    showNext?: boolean;
}

const stepConfigs: Record<OnboardingStep, StepConfig> = {
    welcome: {
        message: "Welcome to your cozytab! This is your cozy corner of the internet. Let's show you around!",
        bubblePosition: "bottom",
        showSkip: true,
        pulseTarget: false,
        showNext: true,
    },
    "enter-edit-mode": {
        message: "First, let's unlock your room so you can decorate! Click the lock button to enter Edit Mode.",
        targetSelector: "[data-onboarding='mode-toggle']",
        bubblePosition: "right",
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
        fixedBubblePosition: { top: 92, left: 24 },
        bubblePosition: "top",
        showSkip: true,
        pulseTarget: true,
    },
    "open-shop": {
        message: "Click on the Item Shop to browse and buy new decorations!",
        targetSelector: "[data-onboarding='shop-icon']",
        bubblePosition: "top",
        showSkip: true,
        pulseTarget: true,
    },
    "add-shortcut": {
        message: "Add a shortcut: right-click the computer desktop and paste a URL to pin your favorite site. Drag it wherever you want! ",
        targetSelector: "[data-onboarding='shortcut-desktop']",
        bubblePosition: "top",
        showSkip: true,
        pulseTarget: true,
    },
    "buy-item": {
        message: "Use your coins to buy items! Try buying something you like. You earn more coins each day you visit!",
        bubblePosition: "top",
        showSkip: true,
        pulseTarget: false,
        fixedBubblePosition: { top: 92, right: 24 },
    },
    "set-homepage": {
        message: "Make cozytab your homepage! Press Cmd/Ctrl+, to open settings, then set https://cozytab.club as your homepage. Works in Chrome and Firefox!",
        bubblePosition: "bottom",
        showSkip: true,
        pulseTarget: false,
        showNext: true,
    },
    complete: {
        message: "You're all set! Enjoy decorating your cozytab! 🎉",
        bubblePosition: "bottom",
        showSkip: false,
        pulseTarget: false,
    },
};

export function Onboarding({ currentStep, onComplete, onNext, onSkip, isGuest = false }: OnboardingProps) {
    const handleSkip = async () => {
        if (onSkip) {
            await onSkip();
        } else {
            onComplete();
        }
    };

    if (currentStep === "complete") {
        const completeMessage = isGuest
            ? "You're all set! Log in to save and share your cozytab."
            : stepConfigs.complete.message;
        return (
            <OnboardingSpotlight
                message={completeMessage}
                bubblePosition={stepConfigs.complete.bubblePosition}
                onSkip={handleSkip}
                showSkip={false}
                pulseTarget={false}
            />
        );
    }

    const config = stepConfigs[currentStep];
    const message = config.message;

    return (
        <OnboardingSpotlight
            targetSelector={config.targetSelector}
            message={message}
            bubblePosition={config.bubblePosition}
            fixedBubblePosition={config.fixedBubblePosition}
            onSkip={handleSkip}
            showSkip={config.showSkip}
            pulseTarget={config.pulseTarget}
            onNext={onNext}
            showNext={config.showNext ?? false}
        />
    );
}


