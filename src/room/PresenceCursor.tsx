import { useChatFade } from "../hooks/useChatFade";
import { CursorDisplay } from "./CursorDisplay";

interface PresenceCursorProps {
    name: string;
    isOwner: boolean;
    x: number;
    y: number;
    chatMessage: string | null;
}

export function PresenceCursor({ name, isOwner, x, y, chatMessage }: PresenceCursorProps) {
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
        />
    );
}
