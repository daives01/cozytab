interface CursorDisplayProps {
    name?: string;
    isOwner?: boolean;
    x: number;
    y: number;
    chatMessage?: string | null;
    chatOpacity?: number;
    isLocal?: boolean;
    useFixedPosition?: boolean;
    showNameBadge?: boolean;
    hidePointer?: boolean;
    scale?: number;
    cursorColor?: string;
}

import { CHAT_FADE_DURATION_MS } from "../hooks/useChatFade";
import { getReadableTextColor } from "./utils/cursorColor";

const POINTER_HOTSPOT = { x: 6, y: 3 };
const POINTER_SIZE = { width: 38, height: 48 };

export function CursorDisplay({
    name = "",
    isOwner = true,
    x,
    y,
    chatMessage,
    chatOpacity = 1,
    isLocal = false,
    useFixedPosition = false,
    showNameBadge = false,
    hidePointer = false,
    scale = 1,
    cursorColor,
}: CursorDisplayProps) {
    const pointerColor = cursorColor ?? (isOwner ? "var(--chart-4)" : "var(--success)");
    const textOnPointerColor = getReadableTextColor(pointerColor);
    const chatTextOnCustomColor = cursorColor ? getReadableTextColor(cursorColor) : undefined;
    const chatBubbleClasses = "text-sm px-4 py-2 rounded-2xl border shadow-lg max-w-[200px] break-words flex items-center justify-center min-w-[40px] min-h-[32px]";
    // Keep name badge + chat bubble aligned and nudged away from the cursor
    const textStackOffsetClasses = isLocal ? "ml-10 mt-4" : "ml-8 mb-2";

    return (
        <div
            className="pointer-events-none"
            style={{
                position: useFixedPosition ? "fixed" : "absolute",
                left: x,
                top: y,
                zIndex: useFixedPosition ? 99999 : (isLocal ? 101 : 100),
                transform: useFixedPosition
                    ? `translate(${-POINTER_HOTSPOT.x}px, ${-POINTER_HOTSPOT.y}px)`
                    : `translate(${-POINTER_HOTSPOT.x}px, ${-POINTER_HOTSPOT.y}px) scale(${scale > 0 ? 1 / scale : 1})`,
                transformOrigin: "top left",
                transition: isLocal ? "none" : "left 50ms linear, top 50ms linear",
            }}
        >
            {!hidePointer && (
                <svg
                    width={POINTER_SIZE.width}
                    height={POINTER_SIZE.height}
                    viewBox="0 0 100 130"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{
                        display: "block",
                        color: pointerColor,
                        filter: `drop-shadow(var(--shadow-offset-x) var(--shadow-offset-y) 2px var(--shadow-color))`,
                    }}
                >
                    <path
                        d="M23.5 11.2C25.8 7.8 29.9 7.1 33.2 9.5L88.2 50.1C93.4 54 92.5 62.1 86.6 64.8L69.3 72.7L80.1 99.4C82.1 104.3 79.5 110 74.5 112L63.8 116.3C58.8 118.3 53.2 115.8 51.1 110.8L40.2 84.1L20.4 89.6C14.3 91.3 8.7 85.3 11.2 79.4L23.5 11.2Z"
                        fill="currentColor"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeLinejoin="round"
                    />
                    <ellipse
                        cx="22"
                        cy="46"
                        rx="12.5"
                        ry="18"
                        transform="rotate(-15 22 46)"
                        fill="white"
                    />
                    <circle cx="24" cy="51" r="5.5" fill="black" />
                    <ellipse
                        cx="50"
                        cy="38"
                        rx="12"
                        ry="18"
                        transform="rotate(-10 50 38)"
                        fill="white"
                    />
                    <circle cx="49" cy="45" r="5.5" fill="black" />
                </svg>
            )}

            <div className={`${textStackOffsetClasses} flex flex-col gap-1 items-start`}>
                {showNameBadge && name && (
                    <div
                        className="w-min text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md"
                        style={{
                            fontFamily: "'Patrick Hand', cursive",
                            backgroundColor: pointerColor,
                            color: textOnPointerColor,
                        }}
                    >
                        {name}
                        {isOwner && " ★"}
                    </div>
                )}

                {
                    chatMessage !== null && chatMessage !== undefined && (
                        <div
                            className={chatBubbleClasses}
                            style={{
                                fontFamily: "'Patrick Hand', cursive",
                                backgroundColor:
                                    cursorColor ??
                                    (isOwner
                                        ? "color-mix(in srgb, var(--chart-4) 15%, var(--primary-foreground))"
                                        : "color-mix(in srgb, var(--success) 15%, var(--primary-foreground))"),
                                borderColor: cursorColor ?? (isOwner ? "var(--chart-4)" : "var(--success)"),
                                color: chatTextOnCustomColor,
                                opacity: chatOpacity,
                                transition: `opacity ${CHAT_FADE_DURATION_MS}ms ease-out`,
                            }}
                        >
                            {chatMessage === "" ? (
                                <div className="flex items-center justify-center h-full">
                                    <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce mx-0.5" style={{ animationDelay: "150ms" }} />
                                    <span className="inline-block w-1.5 h-1.5 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            ) : (
                                chatMessage
                            )}
                        </div>
                    )
                }
            </div>
        </div >
    );
}
