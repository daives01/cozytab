import type React from "react";
import { useEffect, useState } from "react";

interface SpotlightPosition {
    top: number;
    left: number;
    width: number;
    height: number;
}

interface OnboardingSpotlightProps {
    targetSelector?: string;
    targetRef?: React.RefObject<HTMLElement | null>;
    message: string;
    bubblePosition?: "top" | "bottom" | "left" | "right";
    fixedBubblePosition?: Partial<Record<"top" | "left" | "right" | "bottom", number>>;
    onSkip: () => void;
    showSkip?: boolean;
    pulseTarget?: boolean;
    onNext?: () => void;
    showNext?: boolean;
}

export function OnboardingSpotlight({
    targetSelector,
    targetRef,
    message,
    bubblePosition = "bottom",
    fixedBubblePosition,
    onSkip,
    showSkip = true,
    pulseTarget = true,
    onNext,
    showNext = false,
}: OnboardingSpotlightProps) {
    const [spotlight, setSpotlight] = useState<SpotlightPosition | null>(null);

    useEffect(() => {
        const updateSpotlight = () => {
            let element: HTMLElement | null = null;

            if (targetRef?.current) {
                element = targetRef.current;
            } else if (targetSelector) {
                element = document.querySelector(targetSelector);
            }

            if (element) {
                const rect = element.getBoundingClientRect();
                const padding = 8;
                setSpotlight({
                    top: rect.top - padding,
                    left: rect.left - padding,
                    width: rect.width + padding * 2,
                    height: rect.height + padding * 2,
                });
            } else {
                setSpotlight(null);
            }
        };

        updateSpotlight();

        window.addEventListener("resize", updateSpotlight);
        window.addEventListener("scroll", updateSpotlight, true);

        const observer = new MutationObserver(updateSpotlight);
        observer.observe(document.body, { childList: true, subtree: true });

        return () => {
            window.removeEventListener("resize", updateSpotlight);
            window.removeEventListener("scroll", updateSpotlight, true);
            observer.disconnect();
        };
    }, [targetSelector, targetRef]);

    const getBubbleStyle = (): React.CSSProperties => {
        const gap = 20;
        const bubbleWidth = 300;
        const bubbleHeight = 150;
        const margin = 20;

        if (fixedBubblePosition) {
            return {
                position: "fixed",
                top: fixedBubblePosition.top,
                left: fixedBubblePosition.left,
                right: fixedBubblePosition.right,
                bottom: fixedBubblePosition.bottom,
                maxWidth: bubbleWidth,
            };
        }

        if (!spotlight) {
            return {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            };
        }

        let top: number | undefined;
        let left: number | undefined;
        let right: string | undefined;
        let bottom: string | undefined;
        let transform: string | undefined;

        switch (bubblePosition) {
            case "top":
                top = spotlight.top - gap - bubbleHeight;
                left = spotlight.left + spotlight.width / 2 - bubbleWidth / 2;
                break;
            case "bottom":
                top = spotlight.top + spotlight.height + gap;
                left = spotlight.left + spotlight.width / 2 - bubbleWidth / 2;
                break;
            case "left":
                top = spotlight.top + spotlight.height / 2 - bubbleHeight / 2;
                left = spotlight.left - gap - bubbleWidth;
                break;
            case "right":
                top = spotlight.top + spotlight.height / 2 - bubbleHeight / 2;
                left = spotlight.left + spotlight.width + gap;
                break;
        }

        if (top !== undefined) {
            if (top < margin) {
                top = margin;
            }
            if (top + bubbleHeight > window.innerHeight - margin) {
                top = window.innerHeight - margin - bubbleHeight;
            }
        }

        if (left !== undefined) {
            if (left < margin) {
                left = margin;
            }
            if (left + bubbleWidth > window.innerWidth - margin) {
                left = window.innerWidth - margin - bubbleWidth;
            }
        }

        return {
            position: "fixed",
            top,
            left,
            right,
            bottom,
            transform,
            maxWidth: bubbleWidth,
        };
    };

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none font-['Patrick_Hand']">
            {/* Pulse ring around spotlight target */}
            {spotlight && pulseTarget && (
                <div
                    className="absolute rounded-xl border-4 border-[var(--warning)] animate-pulse"
                    style={{
                        top: spotlight.top,
                        left: spotlight.left,
                        width: spotlight.width,
                        height: spotlight.height,
                        boxShadow: "var(--glow-amber)",
                        pointerEvents: "none",
                    }}
                />
            )}

            {/* Speech bubble */}
            <div
                style={{
                    ...getBubbleStyle(),
                    pointerEvents: "auto",
                }}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
                <div className="relative bg-[var(--spotlight-paper)] border-4 border-[var(--spotlight-ink)] rounded-2xl p-5 shadow-[var(--shadow-spotlight)] rotate-[-0.5deg]">
                    {/* Speech bubble tail */}
                    {spotlight && bubblePosition === "bottom" && (
                        <div
                            className="absolute -top-4 left-8 w-0 h-0"
                            style={{
                                borderLeft: "12px solid transparent",
                                borderRight: "12px solid transparent",
                                borderBottom: "16px solid var(--spotlight-ink)",
                            }}
                        />
                    )}
                    {spotlight && bubblePosition === "bottom" && (
                        <div
                            className="absolute -top-2 left-[34px] w-0 h-0"
                            style={{
                                borderLeft: "10px solid transparent",
                                borderRight: "10px solid transparent",
                                borderBottom: "14px solid var(--spotlight-paper)",
                            }}
                        />
                    )}

                    {/* Message content */}
                    <p className="text-[var(--spotlight-ink)] text-lg leading-relaxed mb-3">
                        {message}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-3">
                        {showNext && onNext && (
                            <button
                                onClick={onNext}
                                className="bg-[var(--spotlight-ink)] text-[var(--spotlight-paper)] px-4 py-2 rounded-lg font-semibold shadow-[var(--shadow-spotlight-compact)] hover:shadow-[var(--shadow-spotlight)] transition-all active:translate-x-[2px] active:translate-y-[2px]"
                            >
                                Got it
                            </button>
                        )}
                        {showSkip && (
                            <button
                                onClick={onSkip}
                                className="text-sm text-[var(--spotlight-ink-muted)] hover:text-[var(--spotlight-ink)] underline underline-offset-2 transition-colors ml-auto"
                            >
                                Skip tutorial
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

