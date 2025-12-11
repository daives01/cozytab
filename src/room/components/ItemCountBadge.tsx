import type React from "react";
import { cn } from "@/lib/utils";

type ItemCountBadgeProps = {
    count: number;
    icon?: React.ReactNode;
    muted?: boolean;
    className?: string;
};

export function ItemCountBadge({ count, icon, muted = false, className }: ItemCountBadgeProps) {
    return (
        <span
            className={cn(
                "absolute -top-2.5 -right-2.5 flex items-center gap-1 rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] px-2.5 py-1 text-[11px] font-black uppercase tracking-widest shadow-[var(--shadow-3)]",
                muted && "bg-[var(--color-muted)] text-[var(--color-muted-foreground)]",
                className
            )}
        >
            {icon}
            <span>x{count}</span>
        </span>
    );
}

