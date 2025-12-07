import { Package } from "lucide-react";

export function EmptyState() {
    return (
        <div className="flex flex-col items-center gap-3 rounded-3xl border-2 border-[var(--color-foreground)] bg-[var(--color-card)] px-6 py-8 text-center shadow-[8px_8px_0px_0px_var(--color-foreground)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] text-[var(--color-foreground)] shadow-[4px_4px_0px_0px_var(--color-foreground)]">
                <Package className="h-7 w-7" />
            </div>
            <p className="text-lg font-black uppercase tracking-[0.22em] text-[var(--color-foreground)]">Storage is empty</p>
            <p className="max-w-[220px] text-sm font-medium text-[var(--color-muted-foreground)]">Visit the shop on your computer to start decorating your room.</p>
        </div>
    );
}
