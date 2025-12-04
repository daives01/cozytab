import { CursorDisplay } from "./CursorDisplay";

interface PresenceCursorProps {
    name: string;
    isOwner: boolean;
    x: number;
    y: number;
    chatMessage: string | null;
}

export function PresenceCursor({ name, isOwner, x, y, chatMessage }: PresenceCursorProps) {
    return (
        <CursorDisplay
            name={name}
            isOwner={isOwner}
            x={x}
            y={y}
            chatMessage={chatMessage}
            chatOpacity={chatMessage ? 1 : 0}
            showNameBadge={true}
        />
    );
}
