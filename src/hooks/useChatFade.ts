import { useState, useEffect, useRef } from "react";

export const CHAT_DISPLAY_DURATION_MS = 700;
export const CHAT_FADE_DURATION_MS = 1000;

export function useChatFade(chatMessage: string | null) {
    const [chatOpacity, setChatOpacity] = useState(1);
    const [displayedMessage, setDisplayedMessage] = useState<string | null>(null);
    const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const previousChatMessageRef = useRef<string | null>(null);

    useEffect(() => {
        // Clear any pending fade timeout when message changes
        if (fadeTimeoutRef.current) {
            clearTimeout(fadeTimeoutRef.current);
            fadeTimeoutRef.current = null;
        }

        const previousMessage = previousChatMessageRef.current;
        previousChatMessageRef.current = chatMessage;

        if (chatMessage !== null && chatMessage !== previousMessage) {
            // Actively chatting (including empty string for typing indicator)
            // Only update if message actually changed
            // Defer state update to avoid synchronous setState in effect
            queueMicrotask(() => {
                setDisplayedMessage(chatMessage);
                setChatOpacity(1);
            });
        } else if (chatMessage === null && displayedMessage !== null) {
            // Chat ended - start fade out after delay
            // If the message was empty (typing indicator), fade out immediately after timeout
            // Otherwise wait for user to read the message
            const delay = displayedMessage === "" ? 0 : CHAT_DISPLAY_DURATION_MS;

            fadeTimeoutRef.current = setTimeout(() => {
                setChatOpacity(0);
                setTimeout(() => setDisplayedMessage(null), CHAT_FADE_DURATION_MS);
                fadeTimeoutRef.current = null;
            }, delay);
        }

        return () => {
            if (fadeTimeoutRef.current) {
                clearTimeout(fadeTimeoutRef.current);
            }
        };
    }, [chatMessage, displayedMessage]);

    return { displayedMessage, chatOpacity };
}
