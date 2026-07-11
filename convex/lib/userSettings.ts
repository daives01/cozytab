export function clampVolume(value: unknown, fallback = 0.5): number {
    if (typeof value !== "number" || Number.isNaN(value)) return fallback;
    return Math.max(0, Math.min(1, value));
}

function hslToHex(h: number, s: number, l: number): string {
    const saturation = s / 100;
    const light = l / 100;
    const chroma = (1 - Math.abs(2 * light - 1)) * saturation;
    const intermediate = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const match = light - chroma / 2;
    let red = 0;
    let green = 0;
    let blue = 0;
    if (h < 60) [red, green] = [chroma, intermediate];
    else if (h < 120) [red, green] = [intermediate, chroma];
    else if (h < 180) [green, blue] = [chroma, intermediate];
    else if (h < 240) [green, blue] = [intermediate, chroma];
    else if (h < 300) [red, blue] = [intermediate, chroma];
    else [red, blue] = [chroma, intermediate];
    const toHex = (value: number) => Math.round((value + match) * 255).toString(16).padStart(2, "0");
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

export function randomBrightColor(): string {
    return hslToHex(
        Math.floor(Math.random() * 360),
        70 + Math.floor(Math.random() * 30),
        55 + Math.floor(Math.random() * 15)
    );
}

const GRID_COLUMNS = 6;

export function normalizeShortcutsWithGrid<T extends { id: string; name: string; url: string; row?: number; col?: number }>(shortcuts: T[]) {
    const occupied = new Set<string>();
    const clamp = (value: number) => Math.max(0, Math.round(value));
    return shortcuts.map((shortcut, index) => {
        let row = typeof shortcut.row === "number" && !Number.isNaN(shortcut.row) ? clamp(shortcut.row) : Math.floor(index / GRID_COLUMNS);
        let col = typeof shortcut.col === "number" && !Number.isNaN(shortcut.col) ? clamp(shortcut.col) : index % GRID_COLUMNS;
        while (occupied.has(`${row}-${col}`)) {
            col++;
            if (col >= GRID_COLUMNS) { col = 0; row++; }
        }
        occupied.add(`${row}-${col}`);
        return { ...shortcut, row, col };
    });
}
