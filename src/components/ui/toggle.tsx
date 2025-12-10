import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

type ToggleSize = "sm" | "md";

const sizeStyles: Record<
    ToggleSize,
    { track: string; knobBase: string; knobChecked: string; knobUnchecked: string }
> = {
    md: {
        track: "h-9 w-16",
        knobBase: "top-1 left-1 h-6 w-6",
        knobChecked: "translate-x-7",
        knobUnchecked: "translate-x-0",
    },
    sm: {
        track: "h-6 w-11",
        knobBase: "top-1 left-1 h-4 w-4",
        knobChecked: "translate-x-[18px]",
        knobUnchecked: "translate-x-0",
    },
};

type ToggleSwitchProps = {
    checked: boolean;
    onCheckedChange: (nextValue: boolean) => void;
    size?: ToggleSize;
    activeClassName?: string;
    inactiveClassName?: string;
    trackClassName?: string;
    trackBorderClassName?: string;
    knobClassName?: string;
    knobBorderClassName?: string;
    disabled?: boolean;
} & Omit<ComponentPropsWithoutRef<"button">, "onClick" | "type">;

export function ToggleSwitch({
    checked,
    onCheckedChange,
    size = "md",
    activeClassName,
    inactiveClassName,
    trackClassName,
    trackBorderClassName,
    knobClassName,
    knobBorderClassName,
    disabled,
    className,
    ...buttonProps
}: ToggleSwitchProps) {
    const styles = sizeStyles[size];

    const handleClick = () => {
        if (disabled) return;
        onCheckedChange(!checked);
    };

    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={handleClick}
            className={cn(
                "relative rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--color-foreground)]",
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
                styles.track,
                checked ? activeClassName ?? "bg-[var(--color-share-accent)]" : inactiveClassName ?? "bg-[var(--color-muted)]",
                trackBorderClassName ?? "border-2 border-[var(--color-foreground)]",
                trackClassName,
                className
            )}
            {...buttonProps}
        >
            <span
                className={cn(
                    "absolute rounded-full bg-[var(--color-background)] shadow-sm transition-transform duration-300",
                    knobBorderClassName ?? "border-2 border-[var(--color-foreground)]",
                    styles.knobBase,
                    checked ? styles.knobChecked : styles.knobUnchecked,
                    knobClassName
                )}
            />
        </button>
    );
}
