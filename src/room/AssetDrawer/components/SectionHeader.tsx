import { ChevronDown } from "lucide-react";

export function SectionHeader({
    title,
    count,
    collapsed,
    onToggle,
}: {
    title: string;
    count: number;
    collapsed: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className="flex w-full items-center justify-between rounded-2xl border-2 border-[var(--color-foreground)] bg-[var(--color-card)] px-4 py-3 text-left shadow-[4px_4px_0px_0px_var(--color-foreground)] transition-all hover:-translate-y-[1px] hover:shadow-[6px_6px_0px_0px_var(--color-foreground)]"
        >
            <span className="flex items-center gap-2 text-[var(--color-foreground)]">
                <span className="text-xs font-black uppercase tracking-[0.15em]">{title}</span>
                <span className="rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                    {count}
                </span>
            </span>
            <ChevronDown
                className={`h-4 w-4 text-[var(--color-foreground)] transition-transform duration-300 ${collapsed ? "-rotate-90" : ""}`}
            />
        </button>
    );
}
