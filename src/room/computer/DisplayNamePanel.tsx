import { useEffect, useState, type FormEvent } from "react";

interface DisplayNamePanelProps {
    currentDisplayName: string;
    usernameFallback?: string;
    isSaving: boolean;
    error?: string | null;
    onSave: (next: string) => void;
}

export function DisplayNamePanel({
    currentDisplayName,
    usernameFallback,
    isSaving,
    error,
    onSave,
}: DisplayNamePanelProps) {
    const [value, setValue] = useState(currentDisplayName);

    useEffect(() => {
        setValue(currentDisplayName);
    }, [currentDisplayName]);

    const helper =
        usernameFallback && usernameFallback !== currentDisplayName
            ? `If blank, we'll fall back to ${usernameFallback}.`
            : "This is shown to friends and visitors.";

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onSave(value);
    };

    return (
        <div className="h-full bg-gradient-to-br from-white to-stone-100 text-stone-800">
            <div className="p-4 border-b border-stone-200">
                <h2 className="text-lg font-semibold">Update display name</h2>
                <p className="text-sm text-stone-600 mt-1">{helper}</p>
            </div>

            <form className="p-4 space-y-3" onSubmit={handleSubmit}>
                <label className="flex flex-col gap-2 text-sm font-medium text-stone-700">
                    Display name
                    <input
                        value={value}
                        onChange={(e) => setValue(e.target.value)}
                        className="w-full rounded border border-stone-300 px-3 py-2 shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 transition"
                        maxLength={50}
                        placeholder={usernameFallback ?? "Your name"}
                    />
                </label>

                {error ? (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                        {error}
                    </div>
                ) : null}

                <div className="flex items-center gap-3">
                    <button
                        type="submit"
                        disabled={isSaving || value.trim().length === 0}
                        className="inline-flex items-center justify-center px-4 py-2 rounded border-2 border-t-white border-l-white border-b-stone-400 border-r-stone-400 bg-gradient-to-b from-stone-100 to-stone-200 hover:from-white hover:to-stone-100 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isSaving ? "Saving..." : "Save"}
                    </button>
                    <span className="text-xs text-stone-500">Max 50 characters.</span>
                </div>
            </form>
        </div>
    );
}
