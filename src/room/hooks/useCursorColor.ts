import { useLayoutEffect } from "react";

type CursorKind = "default" | "click" | "drag" | "text";
type CursorValueMap = Record<CursorKind, string>;

const STORAGE_KEY = "cozy-cursor-cache-v1";

const cursorSources: Record<CursorKind, { path: string; hotspot: string }> = {
    default: { path: "/cursor.svg", hotspot: "6 3, auto" },
    click: { path: "/cursor-click.svg", hotspot: "6 3, pointer" },
    drag: { path: "/cursor-drag.svg", hotspot: "6 3, grab" },
    text: { path: "/cursor-text.svg", hotspot: "6 3, text" },
};

const cursorKinds = Object.keys(cursorSources) as CursorKind[];
const fallbackCursorValues: CursorValueMap = {
    default: `url("/cursor.svg") ${cursorSources.default.hotspot}`,
    click: `url("/cursor-click.svg") ${cursorSources.click.hotspot}`,
    drag: `url("/cursor-drag.svg") ${cursorSources.drag.hotspot}`,
    text: `url("/cursor-text.svg") ${cursorSources.text.hotspot}`,
};
const templateCache: Partial<Record<CursorKind, string>> = {};
let fetchPromise: Promise<void> | null = null;
const DEFAULT_CURSOR_COLOR = "#f59e0b";

function resolveColor(color: string | undefined): string {
    if (!color) return DEFAULT_CURSOR_COLOR;
    if (!color.startsWith("var(")) return color;
    const match = color.match(/var\((--[^),\s]+)/);
    if (!match) return DEFAULT_CURSOR_COLOR;
    if (typeof window === "undefined" || !document?.documentElement) return DEFAULT_CURSOR_COLOR;
    const resolved = getComputedStyle(document.documentElement).getPropertyValue(match[1]);
    return resolved?.trim() || DEFAULT_CURSOR_COLOR;
}

// Kick off a prefetch as soon as the module loads so subsequent calls do not wait.
void ensureTemplates();

async function ensureTemplates() {
    if (fetchPromise) return fetchPromise;

    fetchPromise = (async () => {
        try {
            await Promise.all(
                cursorKinds.map(async (kind) => {
                    if (templateCache[kind]) return;
                    const res = await fetch(cursorSources[kind].path);
                    if (!res.ok) return;
                    templateCache[kind] = await res.text();
                })
            );
        } catch (error) {
            console.error("[cursor] Failed to load cursor templates", error);
        } finally {
            fetchPromise = null;
        }
    })();

    return fetchPromise;
}

function toDataUri(template: string, color: string, hotspot: string) {
    const colored = template.replace(/currentColor/gi, color);
    return `url("data:image/svg+xml;utf8,${encodeURIComponent(colored)}") ${hotspot}`;
}

function refreshCursorImmediately() {
    const root = document.documentElement;
    const body = document.body;
    const value = "var(--cozy-cursor-default, auto)";
    root.style.cursor = value;
    body.style.cursor = value;
}

function buildCursorValues(color: string): CursorValueMap {
    const values = { ...fallbackCursorValues };

    cursorKinds.forEach((kind) => {
        const template = templateCache[kind];
        if (template) {
            values[kind] = toDataUri(template, color, cursorSources[kind].hotspot);
        }
    });

    return values;
}

function applyCursorVariables(values: CursorValueMap) {
    const root = document.documentElement;
    cursorKinds.forEach((kind) => {
        root.style.setProperty(`--cozy-cursor-${kind}`, values[kind]);
    });

    refreshCursorImmediately();
}

function readCachedValues(color: string): CursorValueMap | null {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as { color?: string; values?: CursorValueMap };
        if (parsed.color !== color || !parsed.values) return null;
        return parsed.values;
    } catch {
        return null;
    }
}

function writeCachedValues(color: string, values: CursorValueMap) {
    if (typeof window === "undefined") return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ color, values }));
    } catch {
        // Ignore storage failures (private mode / quota, etc.)
    }
}

export function useCursorColor(color?: string) {
    useLayoutEffect(() => {
        const resolvedColor = resolveColor(color);
        if (!resolvedColor) return;

        let mounted = true;

        const cachedValues = readCachedValues(resolvedColor);
        if (cachedValues) {
            applyCursorVariables(cachedValues);
        }

        ensureTemplates().then(() => {
            if (mounted) {
                const values = buildCursorValues(resolvedColor);
                applyCursorVariables(values);
                const hasTemplates = cursorKinds.every((kind) => Boolean(templateCache[kind]));
                if (hasTemplates) {
                    writeCachedValues(resolvedColor, values);
                }
            }
        });

        return () => {
            mounted = false;
        };
    }, [color]);
}
