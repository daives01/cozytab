import { useEffect } from "react";

type CursorKind = "default" | "click" | "drag" | "text";

const cursorSources: Record<CursorKind, { path: string; hotspot: string }> = {
    default: { path: "/cursor.svg", hotspot: "6 3, auto" },
    click: { path: "/cursor-click.svg", hotspot: "6 3, pointer" },
    drag: { path: "/cursor-drag.svg", hotspot: "6 3, grab" },
    text: { path: "/cursor-text.svg", hotspot: "6 3, text" },
};

const templateCache: Partial<Record<CursorKind, string>> = {};
let fetchPromise: Promise<void> | null = null;

async function ensureTemplates() {
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
        try {
            await Promise.all(
                (Object.keys(cursorSources) as CursorKind[]).map(async (kind) => {
                    if (templateCache[kind]) return;
                    const res = await fetch(cursorSources[kind].path);
                    const text = await res.text();
                    templateCache[kind] = text;
                })
            );
        } finally {
            fetchPromise = null;
        }
    })();

    return fetchPromise;
}

function toDataUri(template: string, color: string, hotspot: string) {
    const colored = template.replace(/currentColor/g, color);
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(colored)}") ${hotspot}`;
}

function setCursorVariables(color: string) {
    const root = document.documentElement;
    const fallback = {
        default: `url("/cursor.svg") ${cursorSources.default.hotspot}`,
        click: `url("/cursor-click.svg") ${cursorSources.click.hotspot}`,
        drag: `url("/cursor-drag.svg") ${cursorSources.drag.hotspot}`,
        text: `url("/cursor-text.svg") ${cursorSources.text.hotspot}`,
    };

    (Object.keys(cursorSources) as CursorKind[]).forEach((kind) => {
        const template = templateCache[kind];
        const value = template
            ? toDataUri(template, color, cursorSources[kind].hotspot)
            : fallback[kind];
        root.style.setProperty(`--cozy-cursor-${kind}`, value);
    });
}

export function useCursorColor(color?: string) {
    useEffect(() => {
        if (!color) return;

        let mounted = true;

        ensureTemplates().finally(() => {
            if (!mounted) return;
            setCursorVariables(color);
        });

        return () => {
            mounted = false;
        };
    }, [color]);
}
