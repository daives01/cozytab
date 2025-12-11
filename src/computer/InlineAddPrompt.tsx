import { useEffect, useRef } from "react";

interface InlineAddPromptProps {
    prompt: { x: number; y: number; row: number; col: number } | null;
    url: string;
    onChange: (value: string) => void;
    onAdd: () => void;
    onCancel: () => void;
}

export function InlineAddPrompt({ prompt, url, onChange, onAdd, onCancel }: InlineAddPromptProps) {
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (!prompt) return;
        requestAnimationFrame(() => {
            inputRef.current?.focus();
            inputRef.current?.select();
        });
    }, [prompt]);

    if (!prompt) return null;

    return (
        <div
            className="fixed z-[120]"
            style={{
                top: prompt.y,
                left: prompt.x,
                transform: "translate(-4px, -8px)",
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="bg-white rounded-lg shadow-xl border border-stone-300 p-3 w-[320px] flex flex-col gap-2 overflow-hidden">
                <div className="text-xs text-stone-500">Add shortcut URL</div>
                <div className="flex gap-2 items-center">
                    <input
                        ref={inputRef}
                        value={url}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                onAdd();
                            }
                            if (e.key === "Escape") {
                                e.preventDefault();
                                onCancel();
                            }
                        }}
                        placeholder="youtube.com"
                        className="flex-1 min-w-0 h-9 rounded border border-stone-300 px-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                        autoFocus
                    />
                    <button
                        onClick={onAdd}
                        disabled={!url.trim()}
                        className="h-9 px-3 rounded bg-blue-600 text-white text-sm font-medium shadow disabled:opacity-50 shrink-0 whitespace-nowrap"
                    >
                        Add
                    </button>
                    <button
                        onClick={onCancel}
                        className="h-9 px-3 rounded border border-stone-300 text-sm text-stone-700 hover:bg-stone-100 shrink-0 whitespace-nowrap"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
