export function DesktopOnlyNotice() {
    return (
        <div className="min-h-screen min-w-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center p-6 font-['Patrick_Hand']">
            <div className="max-w-md w-full bg-[var(--card)] border-4 border-[var(--ink)] rounded-2xl shadow-[var(--shadow-ink-strong)] p-6 rotate-1 text-center space-y-3">
                <div className="text-2xl">Desktop only (for now)</div>
                <p className="text-lg leading-relaxed">
                    Cozytab needs a bit more room. Please visit on a desktop or widen your browser to continue.
                </p>
            </div>
        </div>
    );
}

export function LoadingScreen({ message }: { message: string }) {
    return (
        <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-size-xl">
            {message}
        </div>
    );
}

export function NoDemoRoom() {
    return (
        <div className="h-screen w-screen flex items-center justify-center font-['Patrick_Hand'] text-size-xl">
            Uh oh! Something went wrong. Please try again later.
        </div>
    );
}
