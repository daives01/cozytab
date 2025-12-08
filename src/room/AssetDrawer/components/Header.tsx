import { Package } from "lucide-react";
import { FilterPills } from "./FilterPills";

interface AssetDrawerHeaderProps {
    isCompact: boolean;
    categories: string[];
    selectedFilter: string;
    onFilterChange: (next: string) => void;
}

export function AssetDrawerHeader({ isCompact, categories, selectedFilter, onFilterChange }: AssetDrawerHeaderProps) {
    if (isCompact) {
        return (
            <div className="border-b-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] shadow-[var(--shadow-2)]">
                        <Package className="h-5 w-5 text-[var(--color-foreground)]" />
                    </div>
                    <div className="leading-tight">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[var(--color-foreground)]">Inventory</p>
                        <h2 className="text-base font-bold leading-none text-[var(--color-foreground)]">Storage</h2>
                    </div>
                </div>
                <div className="flex-1 flex justify-end">
                    <FilterPills categories={categories} selectedFilter={selectedFilter} onChange={onFilterChange} />
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="flex items-center justify-between gap-3 border-b-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] px-5 py-4">
                <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] shadow-[var(--shadow-2)]">
                        <Package className="h-6 w-6 text-[var(--color-foreground)]" />
                    </div>
                    <div>
                        <h2 className="text-size-xl font-bold leading-none text-[var(--color-foreground)]">Storage</h2>
                    </div>
                </div>
                <span className="hidden sm:inline-flex items-center rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] px-3 py-1 text-[11px] font-black uppercase tracking-wide shadow-[var(--shadow-2)]">
                    Drag to place
                </span>
            </div>

            <div className="border-b-2 border-[var(--color-foreground)] bg-[var(--color-card)] px-4 py-3">
                <FilterPills categories={categories} selectedFilter={selectedFilter} onChange={onFilterChange} />
            </div>
        </>
    );
}
