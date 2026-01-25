import type React from "react";
import type { Shortcut } from "@shared/guestTypes";
import type { ComputerWindowApp } from "./computerTypes";

export const GRID_COLUMNS = 6;
export const ROW_HEIGHT = 132;
export const DESKTOP_PADDING_Y = 32;
export const MIN_WINDOW_WIDTH = 360;
export const MIN_WINDOW_HEIGHT = 280;

export const WINDOW_DEFAULTS: Record<ComputerWindowApp, { width: number; height: number }> = {
    shop: { width: 920, height: 560 },
    rooms: { width: 480, height: 440 },
    invite: { width: 420, height: 340 },
    about: { width: 520, height: 360 },
    customize: { width: 600, height: 460 },
};

export const WINDOW_ACCENTS: Record<ComputerWindowApp, string> = {
    shop: "from-amber-400 to-orange-500",
    rooms: "from-emerald-500 to-green-600",
    invite: "from-pink-400 to-rose-500",
    about: "from-indigo-400 to-sky-500",
    customize: "from-amber-500 to-amber-600",
};

export function deriveShortcutName(url: string) {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, "");
        const toTitle = (value: string) =>
            value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
        const parts = hostname.split(".");
        if (parts.length >= 2) {
            return toTitle(parts[parts.length - 2]);
        }
        return toTitle(hostname || url);
    } catch {
        return url;
    }
}

export function normalizeShortcuts(shortcuts: Shortcut[]) {
    const occupied = new Set<string>();
    const clamp = (value: number) => Math.max(0, Math.round(value));

    return shortcuts.map((shortcut, index) => {
        let row =
            typeof shortcut.row === "number" && !Number.isNaN(shortcut.row)
                ? clamp(shortcut.row)
                : Math.floor(index / GRID_COLUMNS);
        let col =
            typeof shortcut.col === "number" && !Number.isNaN(shortcut.col)
                ? clamp(shortcut.col)
                : index % GRID_COLUMNS;

        while (occupied.has(`${row}-${col}`)) {
            col++;
            if (col >= GRID_COLUMNS) {
                col = 0;
                row++;
            }
        }
        occupied.add(`${row}-${col}`);

        return { ...shortcut, row, col };
    });
}

export function findNearestCell(
    event: React.DragEvent<HTMLDivElement>,
    container: HTMLDivElement,
    scale: number
) {
    return findCellFromPoint(event.clientX, event.clientY, container, scale);
}

export function findCellFromPoint(
    clientX: number,
    clientY: number,
    container: HTMLDivElement,
    scale: number
) {
    const rect = container.getBoundingClientRect();
    const x = (clientX - rect.left) / (scale || 1);
    const y = (clientY - rect.top) / (scale || 1);

    const col = Math.min(
        GRID_COLUMNS - 1,
        Math.max(0, Math.round((x / rect.width) * GRID_COLUMNS - 0.5))
    );

    const row = Math.max(0, Math.round(y / ROW_HEIGHT - 0.5));

    return { row, col };
}

export function formatTime(now: Date) {
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const displayHours = ((hours + 11) % 12) + 1;
    const suffix = hours >= 12 ? "PM" : "AM";
    const paddedMinutes = minutes.toString().padStart(2, "0");
    return `${displayHours}:${paddedMinutes} ${suffix}`;
}

export function withProtocol(url: string) {
    if (!url) return url;
    return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}
