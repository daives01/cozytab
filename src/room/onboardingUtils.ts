import type { OnboardingStep } from "./Onboarding";

type DetectedOS = "mac" | "windows" | "other";
type DetectedBrowser = "chrome" | "firefox" | "edge" | "unknown";

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

function detectPlatform(): { os: DetectedOS; browser: DetectedBrowser } {
    if (typeof navigator === "undefined") {
        return { os: "other", browser: "unknown" };
    }

    const ua = navigator.userAgent.toLowerCase();

    const os: DetectedOS = (() => {
        if (ua.includes("mac os x") || ua.includes("macintosh")) return "mac";
        if (ua.includes("windows")) return "windows";
        return "other";
    })();

    const browser: DetectedBrowser = (() => {
        if (ua.includes("edg")) return "edge";
        if (ua.includes("firefox")) return "firefox";
        if (ua.includes("chrome")) return "chrome";
        return "unknown";
    })();

    return { os, browser };
}

export function getHomepageInstruction(): string {
    const { os, browser } = detectPlatform();

    const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;

    const instructions =
        "Set cozytab as your homepage in settings! Log in daily to earn a new coin!";
    let specificInstructions = "";

    if (os === "mac") {
        switch (browser) {
            case "chrome":
                specificInstructions =
                    `Chrome: Settings (⌘ ,) → On startup → Open a specific page → ${appUrl}.`;
                break;
            case "edge":
                specificInstructions =
                    `Edge: Settings (⌘ ,) → Start, home, and new tabs → Home → custom page ${appUrl}.`;
                break;
            case "firefox":
                specificInstructions =
                    `Firefox: Settings (⌘ ,) → Home → Homepage and new windows → Custom URL ${appUrl}.`;
                break;
            default:
                break;
        }
    }

    if (os === "windows") {
        switch (browser) {
            case "chrome":
                specificInstructions =
                    `Chrome: Settings (Ctrl ,) → On startup → Open a specific page → ${appUrl}.`;
                break;
            case "edge":
                specificInstructions =
                    `Edge: Settings (Ctrl ,) → Start, home, and new tabs → Home → custom page ${appUrl}.`;
                break;
            case "firefox":
                specificInstructions =
                    `Firefox: Settings (Ctrl ,) → Home → Homepage and new windows → Custom URL ${appUrl}.`;
                break;
            default:
                break;
        }
    }

    // Keep the friendly headline on its own line, then show browser-specific steps.
    return specificInstructions ? `${instructions}\n${specificInstructions}` : instructions;
}

