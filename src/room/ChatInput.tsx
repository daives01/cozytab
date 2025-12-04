import { useCallback, useEffect, useRef, useState } from "react";

interface ChatInputProps {
    onMessageChange: (message: string | null) => void;
    disabled?: boolean;
}

const CHAT_TIMEOUT_MS = 3000;

export function ChatInput({ onMessageChange, disabled = false }: ChatInputProps) {
    const [isActive, setIsActive] = useState(false);
    const messageRef = useRef("");
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearChat = useCallback(() => {
        setIsActive(false);
        messageRef.current = "";
        onMessageChange(null);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, [onMessageChange]);

    const resetTimeout = useCallback(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(clearChat, CHAT_TIMEOUT_MS);
    }, [clearChat]);

    useEffect(() => {
        if (disabled) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
                return;
            }

            if (e.key === "/" && !isActive) {
                e.preventDefault();
                setIsActive(true);
                messageRef.current = "";
                onMessageChange("");
                resetTimeout();
                return;
            }

            if (isActive) {
                if (e.key === "Escape") {
                    e.preventDefault();
                    clearChat();
                    return;
                }

                if (e.key === "Enter") {
                    e.preventDefault();
                    setIsActive(false);
                    resetTimeout();
                    return;
                }

                if (e.key === "Backspace") {
                    e.preventDefault();
                    const newMessage = messageRef.current.slice(0, -1);
                    messageRef.current = newMessage;
                    // Send empty string "" to keep bubble visible with typing indicator
                    onMessageChange(newMessage);
                    resetTimeout();
                    return;
                }

                if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
                    e.preventDefault();
                    const newMessage = (messageRef.current + e.key).slice(0, 100);
                    messageRef.current = newMessage;
                    onMessageChange(newMessage);
                    resetTimeout();
                    return;
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [isActive, disabled, onMessageChange, clearChat, resetTimeout]);

    return null;
}
