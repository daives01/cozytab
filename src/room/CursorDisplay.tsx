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
    const pointerColor = cursorColor ?? (isOwner ? "#6366f1" : "#10b981");
    const chatBubbleBg = cursorColor ? "" : isOwner ? "bg-indigo-100 border-indigo-300" : "bg-emerald-100 border-emerald-300";
    const chatTextColor = cursorColor ? "" : isOwner ? "text-indigo-900" : "text-emerald-900";
    const chatOffsetX = isLocal ? "ml-6" : "ml-4";

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
                        filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.3))",
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

            {showNameBadge && name && (
                <div
                    className="w-min text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md ml-5 -mt-1"
                    style={{ fontFamily: "'Patrick Hand', cursive", backgroundColor: pointerColor }}
                >
                    {name}
                    {isOwner && " ★"}
                </div>
            )}

            {
                chatMessage !== null && chatMessage !== undefined && (
                    <div
                        className={`${chatBubbleBg} ${chatTextColor} ${chatOffsetX} text-sm px-4 py-2 rounded-2xl border shadow-lg mt-1 max-w-[200px] break-words flex items-center justify-center min-w-[40px] min-h-[32px]`}
                        style={{
                            fontFamily: "'Patrick Hand', cursive",
                            backgroundColor: cursorColor ?? undefined,
                            borderColor: cursorColor ?? undefined,
                            color: cursorColor ? "#0f172a" : undefined,
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
        </div >
    );
}
