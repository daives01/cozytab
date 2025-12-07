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

    const instructions = "Set cozytab as your homepage!"
    let specificInstructions = ""

    if (os === "mac") {
        switch (browser) {
            case "chrome":
                specificInstructions = "Press '⌘ + ,' then On startup > Open a specific page > add https://cozytab.club.";
                break;
            case "edge":
                specificInstructions = "Press '⌘ + ,' then Start, home, and new tabs > Home > custom page https://cozytab.club.";
                break;
            case "firefox":
                specificInstructions = "Press '⌘ + ,' then Home > Homepage and new windows > Custom URL https://cozytab.club.";
                break;
            default:
                break;
        }
    }

    if (os === "windows") {
        switch (browser) {
            case "chrome":
                specificInstructions = "Press 'Ctrl + ,' then On startup > Open a specific page > add https://cozytab.club.";
                break;
            case "edge":
                specificInstructions = "Press 'Ctrl + ,' then Start, home, and new tabs > Home > custom page https://cozytab.club.";
                break;
            case "firefox":
                specificInstructions = "Open Settings ('Ctrl + ,'), go to Home, set Custom URL to https://cozytab.club.";
                break;
            default:
                break;
        }
    }

    return `${instructions} ${specificInstructions}`;
}

