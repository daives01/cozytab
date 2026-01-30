import type { ConnectionError } from "@/hooks/useWebSocketPresence";

interface ConnectionBannerProps {
    connectionState: string;
    connectionError?: ConnectionError | null;
}

export function ConnectionBanner({ connectionState, connectionError }: ConnectionBannerProps) {
    if (connectionState === "connected") return null;

    const isError = connectionState === "error";

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-2 max-w-[90vw]">
            <div className={`rounded-xl border-2 px-4 py-3 flex flex-col gap-2 shadow-[4px_4px_0px_0px_var(--color-foreground)] ${
                isError
                    ? "border-red-600 bg-red-50"
                    : "border-[var(--color-foreground)] bg-[var(--color-background)]"
            }`}>
                <div className="flex items-center gap-3">
                    {isError ? (
                        <div className="h-4 w-4 rounded-full bg-red-600 flex-shrink-0" />
                    ) : (
                        <div className="h-4 w-4 border-2 border-[var(--color-foreground)] border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    )}
                    <span className={`text-sm font-medium ${isError ? "text-red-900" : ""}`}>
                        {connectionState === "connecting" && "Connecting..."}
                        {connectionState === "reconnecting" && "Reconnecting..."}
                        {connectionState === "error" && "Connection Failed"}
                    </span>
                </div>
                {isError && connectionError && (
                    <p className="text-xs text-red-800 max-w-[280px] leading-relaxed">
                        {connectionError.message}
                    </p>
                )}
            </div>
        </div>
    );
}
