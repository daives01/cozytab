import { useTouchOnly } from "@/hooks/useTouchCapability";

interface ChatHintProps {
    onTapToChat?: () => void;
}

export function ChatHint({ onTapToChat }: ChatHintProps) {
    const isTouchOnly = useTouchOnly();

    if (isTouchOnly) {
        return (
            <div className="absolute bottom-4 left-4 z-50 pointer-events-auto" data-onboarding="chat-hint">
                <button
                    onClick={onTapToChat}
                    className="bg-[var(--ink)]/80 text-white text-sm px-4 py-2 rounded-lg backdrop-blur-sm border-2 border-[var(--ink)] shadow-sm active:translate-y-[1px] transition-transform"
                    style={{
                        fontFamily: "'Patrick Hand', 'Patrick Hand SC', sans-serif",
                        fontSize: "1.07em",
                        fontWeight: 400,
                    }}
                >
                    Tap to chat
                </button>
            </div>
        );
    }

    return (
        <div className="absolute bottom-4 left-4 z-50 pointer-events-none" data-onboarding="chat-hint">
            <div className="bg-[var(--ink)]/80 text-white text-sm px-3 py-1.5 rounded-lg backdrop-blur-sm border-2 border-[var(--ink)] shadow-sm">
                <span className="font-mono bg-[var(--ink-light)] px-2 py-0.5 rounded text-xs mr-1.5">Enter</span>
                <span
                    style={{
                        fontFamily: "'Patrick Hand', 'Patrick Hand SC', sans-serif",
                        fontSize: "1.07em",
                        fontWeight: 400,
                        fontStyle: "normal",
                        fontSynthesis: "none",
                        fontOpticalSizing: "none",
                    }}
                >
                    to chat
                </span>
            </div>
        </div>
    );
}
