import { useEffect, useState, useRef } from "react";

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
    onSkip,
    showSkip = true,
    pulseTarget = true,
    onNext,
    showNext = false,
}: OnboardingSpotlightProps) {
    const [spotlight, setSpotlight] = useState<SpotlightPosition | null>(null);
    const messageRef = useRef<HTMLDivElement>(null);

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
        if (!spotlight) {
            return {
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
            };
        }

        const gap = 20;
        const bubbleWidth = 300;
        const bubbleHeight = 150;
        const margin = 20;

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
            {/* Dark overlay with cutout */}
            <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
            >
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        {spotlight && (
                            <rect
                                x={spotlight.left}
                                y={spotlight.top}
                                width={spotlight.width}
                                height={spotlight.height}
                                rx="12"
                                ry="12"
                                fill="black"
                            />
                        )}
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(0, 0, 0, 0.12)"
                    mask="url(#spotlight-mask)"
                />
            </svg>

            {/* Pulse ring around spotlight target */}
            {spotlight && pulseTarget && (
                <div
                    className="absolute rounded-xl border-4 border-amber-400 animate-pulse"
                    style={{
                        top: spotlight.top,
                        left: spotlight.left,
                        width: spotlight.width,
                        height: spotlight.height,
                        boxShadow: "0 0 20px 4px rgba(251, 191, 36, 0.5)",
                        pointerEvents: "none",
                    }}
                />
            )}

            {/* Speech bubble */}
            <div
                ref={messageRef}
                style={{
                    ...getBubbleStyle(),
                    pointerEvents: "auto",
                }}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
                <div className="relative bg-[#fffef0] border-4 border-[#5c4d3c] rounded-2xl p-5 shadow-[6px_6px_0px_0px_rgba(92,77,60,0.8)] rotate-[-0.5deg]">
                    {/* Speech bubble tail */}
                    {spotlight && bubblePosition === "bottom" && (
                        <div
                            className="absolute -top-4 left-8 w-0 h-0"
                            style={{
                                borderLeft: "12px solid transparent",
                                borderRight: "12px solid transparent",
                                borderBottom: "16px solid #5c4d3c",
                            }}
                        />
                    )}
                    {spotlight && bubblePosition === "bottom" && (
                        <div
                            className="absolute -top-2 left-[34px] w-0 h-0"
                            style={{
                                borderLeft: "10px solid transparent",
                                borderRight: "10px solid transparent",
                                borderBottom: "14px solid #fffef0",
                            }}
                        />
                    )}

                    {/* Message content */}
                    <p className="text-[#5c4d3c] text-lg leading-relaxed mb-3">
                        {message}
                    </p>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between gap-3">
                        {showNext && onNext && (
                            <button
                                onClick={onNext}
                                className="bg-[#5c4d3c] text-[#fffef0] px-4 py-2 rounded-lg font-semibold shadow-[3px_3px_0px_0px_rgba(92,77,60,0.8)] hover:shadow-[2px_2px_0px_0px_rgba(92,77,60,0.8)] transition-all active:translate-x-[2px] active:translate-y-[2px]"
                            >
                                Got it
                            </button>
                        )}
                        {showSkip && (
                            <button
                                onClick={onSkip}
                                className="text-sm text-[#8b7355] hover:text-[#5c4d3c] underline underline-offset-2 transition-colors ml-auto"
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

