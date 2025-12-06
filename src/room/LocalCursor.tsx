import { useChatFade } from "../hooks/useChatFade";
import { CursorDisplay } from "./CursorDisplay";

interface LocalCursorProps {
    x: number;
    y: number;
    chatMessage?: string | null;
    cursorColor?: string;
}

export function LocalCursor({ x, y, chatMessage = null, cursorColor }: LocalCursorProps) {
    const { displayedMessage, chatOpacity } = useChatFade(chatMessage);

    if (displayedMessage === null) {
        return null;
    }

    return (
        <CursorDisplay
            x={x}
            y={y}
            chatMessage={displayedMessage}
            chatOpacity={chatOpacity}
            isLocal={true}
            useFixedPosition={true}
            hidePointer={true}
            cursorColor={cursorColor}
        />
    );
}
