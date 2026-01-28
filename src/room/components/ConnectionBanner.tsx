interface ConnectionBannerProps {
    connectionState: string;
}

export function ConnectionBanner({ connectionState }: ConnectionBannerProps) {
    if (connectionState === "connected") return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2">
            <div className="rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[4px_4px_0px_0px_var(--color-foreground)] px-4 py-3 flex items-center gap-3">
                <div className="h-4 w-4 border-2 border-[var(--color-foreground)] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">
                    {connectionState === "connecting" ? "Connecting..." : "Reconnecting..."}
                </span>
            </div>
        </div>
    );
}
