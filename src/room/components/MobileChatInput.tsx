import { forwardRef, useState, useRef, useCallback, useEffect } from "react";

interface MobileChatInputProps {
    onMessageChange: (message: string | null) => void;
    disabled?: boolean;
}

const CHAT_TIMEOUT_MS = 2000;
const MAX_CHAT_LENGTH = 75;

export const MobileChatInput = forwardRef<HTMLInputElement, MobileChatInputProps>(
    function MobileChatInput({ onMessageChange, disabled = false }, ref) {
        const [value, setValue] = useState("");
        const [isFocused, setIsFocused] = useState(false);
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

        return (
            <div
                className={`fixed left-4 right-4 z-50 transition-opacity ${
                    isFocused || value ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                style={{
                    bottom: "calc(4rem + env(safe-area-inset-bottom, 0px))",
                }}
            >
                <input
                    ref={ref}
                    type="text"
                    value={value}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message..."
                    className="w-full px-4 py-3 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] text-[var(--color-foreground)] shadow-[4px_4px_0px_0px_var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                    style={{
                        fontFamily: "'Patrick Hand', 'Patrick Hand SC', sans-serif",
                        fontSize: "1.1em",
                    }}
                />
            </div>
        );
    }
);
