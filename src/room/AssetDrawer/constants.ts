export const ASSET_DRAWER_WIDTH = 300;
export const ASSET_DRAWER_BOTTOM_HEIGHT = 360;
export const HIDE_TOGGLE_THRESHOLD = 5;

export const handwritingFont = {
    fontFamily: "'Patrick Hand', 'Patrick Hand SC', sans-serif",
    fontWeight: 400,
    fontStyle: "normal",
    fontSynthesis: "none" as const,
    fontOpticalSizing: "none" as const,
};

export const pillClass =
    "h-9 rounded-full border-2 border-[var(--color-foreground)] px-4 text-[11px] font-black uppercase tracking-widest shadow-[var(--shadow-2)] transition-all";

export const cardClass =
    "group relative flex cursor-grab select-none flex-col gap-2 rounded-2xl border-2 border-[var(--color-foreground)] bg-[var(--color-card)] p-3 shadow-[var(--shadow-4)] transition-all active:cursor-grabbing hover:-translate-y-[2px] hover:shadow-[var(--shadow-6)]";
export const compactCardClass =
    "group relative flex cursor-grab select-none flex-col gap-1.5 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-card)] p-2 shadow-[var(--shadow-4-soft)] transition-all active:cursor-grabbing hover:-translate-y-[1px] hover:shadow-[var(--shadow-4)]";

export const iconButtonClass =
    "absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] text-[var(--color-foreground)] shadow-[var(--shadow-2)] transition-all hover:-translate-y-[1px] hover:shadow-[var(--shadow-4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]";
