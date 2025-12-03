import { useState, useEffect, useRef } from "react";
import { CursorDisplay } from "./CursorDisplay";

interface LocalCursorProps {
    x: number;
    y: number;
    chatMessage?: string | null;
}

const CHAT_DISPLAY_DURATION_MS = 3000;
const CHAT_FADE_DURATION_MS = 500;

export function LocalCursor({ x, y, chatMessage = null }: LocalCursorProps) {
    const [chatOpacity, setChatOpacity] = useState(1);
    const [displayedMessage, setDisplayedMessage] = useState<string | null>(null);
    const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastMessageRef = useRef<string | null>(null);
    const updateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        // Clear any pending updates
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
            updateTimeoutRef.current = null;
        }

        if (chatMessage) {
            // Schedule state update asynchronously to avoid synchronous setState in effect
            updateTimeoutRef.current = setTimeout(() => {
                setDisplayedMessage(chatMessage);
                setChatOpacity(1);
                lastMessageRef.current = chatMessage;
                updateTimeoutRef.current = null;
            }, 0);
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
                fadeTimeoutRef.current = null;
            }
        } else if (lastMessageRef.current !== null && chatMessage === null) {
            lastMessageRef.current = null;
            fadeTimeoutRef.current = setTimeout(() => {
                setChatOpacity(0);
                setTimeout(() => setDisplayedMessage(null), CHAT_FADE_DURATION_MS);
                fadeTimeoutRef.current = null;
            }, CHAT_DISPLAY_DURATION_MS);
        }

        return () => {
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, [chatMessage]);

    return (
        <CursorDisplay
            x={x}
            y={y}
            chatMessage={displayedMessage}
            chatOpacity={chatOpacity}
            isLocal={true}
            useFixedPosition={true}
        />
    );
}
