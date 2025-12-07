import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type ToastTone = "default" | "warning" | "success";

const toneClasses: Record<
  ToastTone,
  { card: string; icon: string; close: string }
> = {
  default: {
    card: "bg-[var(--color-card)]",
    icon: "bg-[var(--color-secondary)]",
    close: "bg-[var(--color-card)]",
  },
  warning: {
    card: "bg-[var(--warning-light)]",
    icon: "bg-[var(--warning)]",
    close: "bg-[var(--warning-light)]",
  },
  success: {
    card: "bg-[var(--success-light)]",
    icon: "bg-[var(--success)]",
    close: "bg-[var(--success-light)]",
  },
};

interface ToastProps {
  icon?: ReactNode;
  title?: ReactNode;
  description?: ReactNode;
  tone?: ToastTone;
  onClose?: () => void;
  className?: string;
  children?: ReactNode;
}

export function Toast({
  icon,
  title,
  description,
  tone = "default",
  onClose,
  className,
  children,
}: ToastProps) {
  const toneStyle = toneClasses[tone];

  return (
    <div className="pointer-events-none fixed top-6 right-6 z-[130] animate-in slide-in-from-right fade-in duration-300 font-['Patrick_Hand']">
      <div
        className={cn(
          "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-3xl border-2 border-[var(--color-foreground)] px-4 py-3 text-[var(--color-foreground)] shadow-[4px_4px_0px_0px_var(--color-shadow-color)]",
          toneStyle.card,
          className,
        )}
      >
        {icon && (
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-[var(--color-foreground)] text-[var(--color-foreground)] shadow-[2px_2px_0px_0px_var(--color-shadow-color)]",
              toneStyle.icon,
            )}
            aria-hidden
          >
            {icon}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-1">
          {title && <span className="text-sm font-bold leading-tight">{title}</span>}
          {description && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink-subtle)]">
              {description}
            </span>
          )}
          {children}
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "ml-auto flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-foreground)] text-[var(--color-foreground)] shadow-[2px_2px_0px_0px_var(--color-shadow-color)] transition-transform duration-100 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none",
              toneStyle.close,
            )}
            aria-label="Dismiss toast"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}
