import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import type { OnboardingStep } from "../Onboarding";
import { getNextStep } from "../onboardingUtils";

interface UseOnboardingOptions {
    user: { onboardingCompleted?: boolean } | null | undefined;
    isGuest: boolean;
    completeOnboarding: () => Promise<{ success: boolean }>;
}

export function useOnboarding({ user, isGuest, completeOnboarding }: UseOnboardingOptions) {
    const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null);
    const [onboardingActive, setOnboardingActive] = useState(false);
    const onboardingInitialized = useRef(false);

    useEffect(() => {
        if (!isGuest && user && user.onboardingCompleted === false && !onboardingActive && !onboardingInitialized.current) {
            onboardingInitialized.current = true;
            startTransition(() => {
                setOnboardingActive(true);
                setOnboardingStep("welcome");
            });
            setTimeout(() => {
                startTransition(() => {
                    setOnboardingStep("enter-edit-mode");
                });
            }, 3000);
        }
    }, [user, isGuest, onboardingActive]);

    const handleOnboardingComplete = useCallback(async () => {
        if (!onboardingActive) return;

        setOnboardingActive(false);
        setOnboardingStep(null);
        onboardingInitialized.current = true;
        await completeOnboarding().catch(() => {});
    }, [completeOnboarding, onboardingActive]);

    const advanceOnboarding = useCallback(() => {
        if (onboardingStep && onboardingActive) {
            const nextStep = getNextStep(onboardingStep);
            if (nextStep === "complete") {
                setOnboardingStep("complete");
                setTimeout(() => {
                    handleOnboardingComplete();
                }, 2500);
            } else {
                setOnboardingStep(nextStep);
            }
        }
    }, [onboardingStep, onboardingActive, handleOnboardingComplete]);

    return {
        onboardingStep,
        onboardingActive,
        advanceOnboarding,
        handleOnboardingComplete,
    };
}

