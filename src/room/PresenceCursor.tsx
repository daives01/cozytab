import { useChatFade } from "../hooks/useChatFade";
import { CursorDisplay } from "./CursorDisplay";

interface PresenceCursorProps {
    name: string;
    isOwner: boolean;
    x: number;
    y: number;
    chatMessage: string | null;
    scale: number;
    cursorColor?: string;
    inMenu?: boolean;
    tabbedOut?: boolean;
}

export function PresenceCursor({
    name,
    isOwner,
    x,
    y,
    chatMessage,
    scale,
    cursorColor,
    inMenu,
    tabbedOut,
}: PresenceCursorProps) {
    const { displayedMessage, chatOpacity } = useChatFade(chatMessage);

    return (
        <CursorDisplay
            name={name}
            isOwner={isOwner}
            x={x}
            y={y}
            chatMessage={displayedMessage}
            chatOpacity={chatOpacity}
            showNameBadge={true}
            scale={scale}
            cursorColor={cursorColor}
            inMenu={inMenu}
            tabbedOut={tabbedOut}
        />
    );
}
