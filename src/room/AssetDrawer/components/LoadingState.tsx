export function LoadingState() {
    return (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-[var(--color-foreground)]/30 bg-[var(--color-card)] px-4 py-6 text-center shadow-[var(--shadow-4)]">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-dashed border-[var(--color-foreground)]/30" />
            <p className="text-sm font-medium text-[var(--color-muted-foreground)]">Loading storage…</p>
        </div>
    );
}
