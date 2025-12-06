import { useEffect } from "react";

const CURSOR_SOURCES = {
    default: { path: "/cursor.svg", hotspot: "6 3, auto" },
    click: { path: "/cursor-click.svg", hotspot: "6 3, pointer" },
    drag: { path: "/cursor-drag.svg", hotspot: "6 3, grab" },
    text: { path: "/cursor-text.svg", hotspot: "6 3, text" },
} as const;

const svgCache = new Map<string, string>();

async function loadSvg(path: string): Promise<string> {
    if (svgCache.has(path)) {
        return svgCache.get(path) as string;
    }
    const response = await fetch(path);
    const text = await response.text();
    svgCache.set(path, text);
    return text;
}

function toDataUri(svg: string, color: string): string {
    const tinted = svg.replace(/currentColor/gi, color);
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(tinted)}")`;
}

function buildCursorValue(dataUri: string, hotspot: string) {
    return `${dataUri} ${hotspot}`;
}

/**
 * Loads the cursor SVGs, tints them with the provided color, and writes
 * CSS custom properties that the cursor styles consume.
 */
export function useCursorAssets(color: string) {
    useEffect(() => {
        let cancelled = false;
        const root = document.documentElement;

        async function updateCursors() {
            try {
                const [defaultSvg, clickSvg, dragSvg, textSvg] = await Promise.all([
                    loadSvg(CURSOR_SOURCES.default.path),
                    loadSvg(CURSOR_SOURCES.click.path),
                    loadSvg(CURSOR_SOURCES.drag.path),
                    loadSvg(CURSOR_SOURCES.text.path),
                ]);

                if (cancelled) return;

                root.style.setProperty(
                    "--cozy-cursor-default",
                    buildCursorValue(toDataUri(defaultSvg, color), CURSOR_SOURCES.default.hotspot)
                );
                root.style.setProperty(
                    "--cozy-cursor-click",
                    buildCursorValue(toDataUri(clickSvg, color), CURSOR_SOURCES.click.hotspot)
                );
                root.style.setProperty(
                    "--cozy-cursor-drag",
                    buildCursorValue(toDataUri(dragSvg, color), CURSOR_SOURCES.drag.hotspot)
                );
                root.style.setProperty(
                    "--cozy-cursor-text",
                    buildCursorValue(toDataUri(textSvg, color), CURSOR_SOURCES.text.hotspot)
                );
            } catch (error) {
                console.error("[cursor] Failed to apply cursor color", error);
            }
        }

        updateCursors();

        return () => {
            cancelled = true;
        };
    }, [color]);
}
