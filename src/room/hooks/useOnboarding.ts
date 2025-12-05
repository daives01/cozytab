import { useState, useEffect, useRef, useCallback, startTransition } from "react";
import type { OnboardingStep } from "../Onboarding";
import { getNextStep } from "../onboardingUtils";

interface UseOnboardingOptions {
    user: { onboardingCompleted?: boolean } | null | undefined;
    isGuest: boolean;
    completeOnboarding: () => Promise<{ success: boolean }>;
    guestOnboardingCompleted: boolean;
    markGuestOnboardingComplete: () => void;
    autoStart?: boolean;
}

export function useOnboarding({
    user,
    isGuest,
    completeOnboarding,
    guestOnboardingCompleted,
    markGuestOnboardingComplete,
    autoStart = true,
}: UseOnboardingOptions) {
    const [onboardingStep, setOnboardingStep] = useState<OnboardingStep | null>(null);
    const [onboardingActive, setOnboardingActive] = useState(false);
    const onboardingInitialized = useRef(false);

    // Kick off onboarding once per session when eligible
    useEffect(() => {
        if (!autoStart || onboardingInitialized.current) return;

        const alreadyCompleted = isGuest ? guestOnboardingCompleted : user?.onboardingCompleted === true;
        if (alreadyCompleted) {
            onboardingInitialized.current = true;
            return;
        }

        const shouldStart = (isGuest && !guestOnboardingCompleted) || (!isGuest && user && user.onboardingCompleted === false);
        if (!shouldStart) return;

        onboardingInitialized.current = true;
        startTransition(() => {
            setOnboardingActive(true);
            setOnboardingStep("welcome");
        });
    }, [autoStart, guestOnboardingCompleted, isGuest, user]);

    // Auto-advance from welcome to the first actionable step
    useEffect(() => {
        if (!onboardingActive || onboardingStep !== "welcome") return;
        const timer = setTimeout(() => {
            startTransition(() => {
                setOnboardingStep("enter-edit-mode");
            });
        }, 3000);
        return () => clearTimeout(timer);
    }, [onboardingActive, onboardingStep]);

    const handleOnboardingComplete = useCallback(async () => {
        if (!onboardingActive) return;

        setOnboardingActive(false);
        setOnboardingStep(null);
        onboardingInitialized.current = true;

        if (isGuest) {
            markGuestOnboardingComplete();
            return;
        }

        await completeOnboarding().catch(() => {});
    }, [completeOnboarding, onboardingActive, isGuest, markGuestOnboardingComplete]);

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

