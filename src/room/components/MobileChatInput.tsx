import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";

const CHAT_TIMEOUT_MS = 2000;
const MAX_CHAT_LENGTH = 75;

interface MobileChatInputProps {
    onMessageChange: (message: string | null) => void;
    disabled?: boolean;
}

export function MobileChatInput({
    onMessageChange,
    disabled = false,
}: MobileChatInputProps) {
    const [value, setValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearChat = useCallback(() => {
        setValue("");
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
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (disabled) return;
        const newValue = e.target.value.slice(-MAX_CHAT_LENGTH);
        setValue(newValue);
        onMessageChange(newValue || "");
        resetTimeout();
    };

    const handleFocus = () => {
        setIsFocused(true);
        onMessageChange("");
        resetTimeout();
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (!value) {
            clearChat();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            e.preventDefault();
            (e.target as HTMLInputElement).blur();
            clearChat();
        }
    };

    if (disabled) return null;

    return createPortal(
        <div
            className={`fixed left-4 z-[120] transition-opacity ${
                isFocused || value ? "opacity-100" : "opacity-90"
            }`}
            style={{
                bottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
                width: "calc(50% - 1rem)",
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
        >
            <input
                ref={inputRef}
                type="text"
                value={value}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder="Chat"
                className="w-full h-12 px-4 rounded-xl border-2 border-[var(--ink)] bg-[var(--paper)] text-[var(--ink)] shadow-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                style={{
                    fontFamily: "'Patrick Hand', 'Patrick Hand SC', sans-serif",
                    fontSize: "1.1em",
                }}
            />
        </div>,
        document.body
    );
}
