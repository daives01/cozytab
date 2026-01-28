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
    inMenu?: boolean;
    tabbedOut?: boolean;
    dimmed?: boolean;
    rotated?: boolean;
    onClick?: () => void;
}

import { CHAT_FADE_DURATION_MS } from "../hooks/useChatFade";
import { getReadableTextColor } from "@/room/utils/cursorColor";
import { CursorAvatar } from "@/components/CursorAvatar";

const POINTER_HOTSPOT = { x: 6, y: 3 };
const POINTER_SIZE = { width: 38, height: 48 };
const CHAT_MAX_WIDTH_PX = 220;

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
    inMenu = false,
    tabbedOut = false,
    dimmed = false,
    rotated = false,
    onClick,
}: CursorDisplayProps) {
    const pointerColor = cursorColor ?? (isOwner ? "var(--chart-4)" : "var(--success)");
    const textOnPointerColor = getReadableTextColor(pointerColor);
    const chatTextOnCustomColor = cursorColor ? getReadableTextColor(cursorColor) : undefined;
    const chatBubbleClasses =
        "text-base px-4 py-2 rounded-2xl border shadow-lg max-w-[220px] whitespace-pre-wrap break-words flex items-center justify-center min-w-[40px] min-h-[32px]";
    // Keep name badge + chat bubble aligned and nudged away from the cursor
    const textStackOffsetClasses = isLocal ? "ml-10 mt-4" : rotated ? "ml-2 -mt-10" : "ml-8 mb-2";
    const handwritingFont = {
        fontFamily: "'Patrick Hand', 'Patrick Hand SC', sans-serif",
        fontWeight: 400,
        fontStyle: "normal",
        fontSynthesis: "none" as const,
        fontOpticalSizing: "none" as const,
        fontSize: "1.07em",
    };

    const presenceOpacity = dimmed ? 0.3 : tabbedOut ? 0.25 : inMenu ? 0.3 : 1;
    const cursorStyle = {
        position: useFixedPosition ? "fixed" : "absolute",
        left: x,
        top: y,
        zIndex: useFixedPosition ? 99999 : isLocal ? 101 : 100,
        transform: useFixedPosition
            ? `translate(${-POINTER_HOTSPOT.x}px, ${-POINTER_HOTSPOT.y}px)`
            : `translate(${-POINTER_HOTSPOT.x}px, ${-POINTER_HOTSPOT.y}px) scale(${scale > 0 ? 1 / scale : 1})`,
        transformOrigin: "top left",
        transition: isLocal ? "none" : "left 50ms linear, top 50ms linear",
        opacity: presenceOpacity,
    } as const;

    return (
        <div className={onClick ? "pointer-events-auto cursor-pointer" : "pointer-events-none"} style={cursorStyle} onClick={onClick}>
            {!hidePointer && (
                <CursorAvatar
                    color={pointerColor}
                    width={POINTER_SIZE.width}
                    height={POINTER_SIZE.height}
                    filter="drop-shadow(var(--shadow-offset-x) var(--shadow-offset-y) 2px var(--shadow-color))"
                    rotated={rotated}
                    hotspot={POINTER_HOTSPOT}
                />
            )}

            <div className={`${textStackOffsetClasses} flex flex-col gap-1 items-start`}>
                {showNameBadge && name && (
                    <div
                        className="w-min text-sm font-bold px-2 py-0.5 rounded-full whitespace-nowrap shadow-md"
                        style={{
                            ...handwritingFont,
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
                                ...handwritingFont,
                                backgroundColor:
                                    cursorColor ??
                                    (isOwner
                                        ? "color-mix(in srgb, var(--chart-4) 15%, var(--primary-foreground))"
                                        : "color-mix(in srgb, var(--success) 15%, var(--primary-foreground))"),
                                borderColor: cursorColor ?? (isOwner ? "var(--chart-4)" : "var(--success)"),
                                color: chatTextOnCustomColor,
                                opacity: chatOpacity,
                                transition: `opacity ${CHAT_FADE_DURATION_MS}ms ease-out`,
                                overflowWrap: "anywhere",
                                wordBreak: "break-word",
                                width: "max-content",
                                maxWidth: CHAT_MAX_WIDTH_PX,
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
