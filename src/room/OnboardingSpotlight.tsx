import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { House } from "lucide-react";

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

const BUBBLE_GAP = 20;
const BUBBLE_MARGIN = 20;
const BUBBLE_WIDTH = 360;
const BUBBLE_HEIGHT = 190;
const SPOTLIGHT_PADDING = 8;

const handwritingFont = {
    fontFamily: "'Patrick Hand', 'Patrick Hand SC', sans-serif",
    fontWeight: 400,
    fontStyle: "normal",
    fontSynthesis: "none" as const,
    fontOpticalSizing: "none" as const,
};

const BubbleTail = ({ shouldRender }: { shouldRender: boolean }) => {
    if (!shouldRender) return null;

    return (
        <>
            <div
                className="absolute -top-4 left-8 h-0 w-0"
                style={{
                    borderLeft: "11px solid transparent",
                    borderRight: "11px solid transparent",
                    borderBottom: "14px solid var(--color-foreground)",
                }}
            />
            <div
                className="absolute -top-[14px] left-[38px] h-0 w-0"
                style={{
                    borderLeft: "10px solid transparent",
                    borderRight: "10px solid transparent",
                    borderBottom: "13px solid var(--color-background)",
                }}
            />
        </>
    );
};

const BubbleHeader = () => (
    <div className="flex items-center justify-between border-b-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] px-5 py-3">
        <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] shadow-[var(--shadow-2)]">
                <House className="h-5 w-5 text-[var(--color-foreground)]" />
            </div>
            <p className="text-base font-bold text-[var(--color-foreground)]">Tutorial</p>
        </div>
    </div>
);

const BubbleActions = ({ showNext, onNext, showSkip, onSkip }: Pick<OnboardingSpotlightProps, "showNext" | "onNext" | "showSkip" | "onSkip">) => (
    <div className="flex items-center gap-3">
        {showNext && onNext && (
            <button
                onClick={onNext}
                className="h-11 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-foreground)] px-4 text-sm font-black uppercase tracking-wide text-[var(--color-background)] shadow-[var(--shadow-4)] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none active:translate-x-[4px] active:translate-y-[4px]"
            >
                Got it
            </button>
        )}
        {showSkip && (
            <button
                onClick={onSkip}
                className="ml-auto text-sm font-semibold text-[var(--color-muted-foreground)] underline underline-offset-4 transition-colors hover:text-[var(--color-foreground)]"
            >
                Skip tutorial
            </button>
        )}
    </div>
);

const clampWithinViewport = (value: number, size: number, margin: number, maxSize: number) => {
    if (value < margin) return margin;
    if (value + size > maxSize - margin) return maxSize - margin - size;
    return value;
};

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

            if (!element) {
                setSpotlight(null);
                return;
            }

            const rect = element.getBoundingClientRect();
            setSpotlight({
                top: rect.top - SPOTLIGHT_PADDING,
                left: rect.left - SPOTLIGHT_PADDING,
                width: rect.width + SPOTLIGHT_PADDING * 2,
                height: rect.height + SPOTLIGHT_PADDING * 2,
            });
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

    const bubbleStyle = useMemo((): React.CSSProperties => {
        if (fixedBubblePosition) {
            return {
                position: "fixed",
                top: fixedBubblePosition.top,
                left: fixedBubblePosition.left,
                right: fixedBubblePosition.right,
                bottom: fixedBubblePosition.bottom,
                maxWidth: BUBBLE_WIDTH,
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

        switch (bubblePosition) {
            case "top":
                top = spotlight.top - BUBBLE_GAP - BUBBLE_HEIGHT;
                left = spotlight.left + spotlight.width / 2 - BUBBLE_WIDTH / 2;
                break;
            case "bottom":
                top = spotlight.top + spotlight.height + BUBBLE_GAP;
                left = spotlight.left + spotlight.width / 2 - BUBBLE_WIDTH / 2;
                break;
            case "left":
                top = spotlight.top + spotlight.height / 2 - BUBBLE_HEIGHT / 2;
                left = spotlight.left - BUBBLE_GAP - BUBBLE_WIDTH;
                break;
            case "right":
                top = spotlight.top + spotlight.height / 2 - BUBBLE_HEIGHT / 2;
                left = spotlight.left + spotlight.width + BUBBLE_GAP;
                break;
        }

        const nextTop = top === undefined ? top : clampWithinViewport(top, BUBBLE_HEIGHT, BUBBLE_MARGIN, window.innerHeight);
        const nextLeft = left === undefined ? left : clampWithinViewport(left, BUBBLE_WIDTH, BUBBLE_MARGIN, window.innerWidth);

        return {
            position: "fixed",
            top: nextTop,
            left: nextLeft,
            maxWidth: BUBBLE_WIDTH,
        };
    }, [bubblePosition, fixedBubblePosition, spotlight]);

    const shouldShowTail = Boolean(spotlight && bubblePosition === "bottom");

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none font-['Patrick_Hand']">
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

            <div
                style={{ ...bubbleStyle, pointerEvents: "auto" }}
                className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
                <div
                    className="relative overflow-hidden rounded-3xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[var(--shadow-6)]"
                    style={handwritingFont}
                >
                    <BubbleTail shouldRender={shouldShowTail} />
                    <BubbleHeader />

                    <div className="space-y-4 px-6 py-5">
                        <p className="text-base font-medium leading-relaxed text-[var(--color-foreground)]">{message}</p>
                        <BubbleActions showNext={showNext} onNext={onNext} showSkip={showSkip} onSkip={onSkip} />
                    </div>
                </div>
            </div>
        </div>
    );
}
