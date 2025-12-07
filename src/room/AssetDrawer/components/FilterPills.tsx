import { Button } from "@/components/ui/button";
import { pillClass } from "../constants";
import type { FilterPillsProps } from "../types";

export function FilterPills({ categories, selectedFilter, onChange }: FilterPillsProps) {
    return (
        <div className="flex flex-wrap gap-2">
            {["all", ...categories].map((category) => {
                const isActive = selectedFilter === category;
                const label = category === "all" ? "All" : category;

                return (
                    <Button
                        key={category}
                        size="sm"
                        variant="ghost"
                        onClick={() => onChange(category)}
                        className={`${pillClass} ${
                            isActive
                                ? "bg-[var(--color-foreground)] text-[var(--color-background)] hover:bg-[var(--color-foreground)] hover:text-[var(--color-background)] hover:-translate-y-[1px] hover:shadow-[var(--shadow-4)]"
                                : "bg-[var(--color-background)] text-[var(--color-foreground)] hover:-translate-y-[1px] hover:bg-[var(--color-secondary)] hover:shadow-[var(--shadow-4)]"
                        } ${category !== "all" ? "capitalize" : ""}`}
                        aria-pressed={isActive}
                    >
                        {label}
                    </Button>
                );
            })}
        </div>
    );
}
