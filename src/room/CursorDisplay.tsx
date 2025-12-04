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
}

import { CHAT_FADE_DURATION_MS } from "../hooks/useChatFade";

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
}: CursorDisplayProps) {
    const cursorColor = isOwner ? "#6366f1" : "#10b981";
    const bgColor = isOwner ? "bg-indigo-500" : "bg-emerald-500";
    const chatBubbleBg = isOwner ? "bg-indigo-100 border-indigo-300" : "bg-emerald-100 border-emerald-300";
    const chatTextColor = isOwner ? "text-indigo-900" : "text-emerald-900";

    return (
        <div
            className="pointer-events-none"
            style={{
                position: useFixedPosition ? "fixed" : "absolute",
                left: x,
                top: y,
                zIndex: useFixedPosition ? 99999 : (isLocal ? 101 : 100),
                transform: "translate(-2px, -2px)",
                transition: isLocal ? "none" : "left 50ms linear, top 50ms linear",
            }}
        >
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                style={{ filter: "drop-shadow(1px 2px 2px rgba(0,0,0,0.3))" }}
            >
                <path
                    d="M5 3 L5 17 L9 13 L12 19 L15 18 L12 12 L18 12 L5 3Z"
                    fill={cursorColor}
                    stroke="#1f2937"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>

            {showNameBadge && name && (
                <div
                    className={`${bgColor} w-min text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md ml-4 -mt-1`}
                    style={{ fontFamily: "'Patrick Hand', cursive" }}
                >
                    {name}
                    {isOwner && " ★"}
                </div>
            )}

            {
                chatMessage !== null && chatMessage !== undefined && (
                    <div
                        className={`${chatBubbleBg} ${chatTextColor} text-sm px-4 py-2 rounded-2xl border shadow-lg ml-4 mt-1 max-w-[200px] break-words flex items-center justify-center min-w-[40px] min-h-[32px]`}
                        style={{
                            fontFamily: "'Patrick Hand', cursive",
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
