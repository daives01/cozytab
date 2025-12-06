import { useEffect, useMemo, useState } from "react";

interface DisplayNameSectionProps {
    currentDisplayName: string;
    usernameFallback?: string;
    isSaving: boolean;
    error?: string | null;
    onSave: (next: string) => void;
}

interface CustomizePanelProps {
    displayNameProps?: DisplayNameSectionProps;
    color: string;
    onColorChange: (next: string) => void;
}

type HslColor = { h: number; s: number; l: number };

function clampHue(value: number) {
    if (Number.isNaN(value)) return 0;
    const wrapped = value % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
}

function hexToHsl(hex: string): HslColor {
    const sanitized = hex.replace("#", "");
    const fullHex =
        sanitized.length === 3
            ? sanitized
                  .split("")
                  .map((c) => c + c)
                  .join("")
            : sanitized;

    if (fullHex.length !== 6) {
        return { h: 36, s: 90, l: 55 };
    }

    const r = parseInt(fullHex.substring(0, 2), 16) / 255;
    const g = parseInt(fullHex.substring(2, 4), 16) / 255;
    const b = parseInt(fullHex.substring(4, 6), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    let h = 0;

    if (delta === 0) {
        h = 0;
    } else if (max === r) {
        h = ((g - b) / delta) % 6;
    } else if (max === g) {
        h = (b - r) / delta + 2;
    } else {
        h = (r - g) / delta + 4;
    }

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    const l = (max + min) / 2;
    const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

    return { h, s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number) {
    const sat = s / 100;
    const light = l / 100;
    const c = (1 - Math.abs(2 * light - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = light - c / 2;
    let r = 0;
    let g = 0;
    let b = 0;

    if (h >= 0 && h < 60) {
        r = c;
        g = x;
        b = 0;
    } else if (h >= 60 && h < 120) {
        r = x;
        g = c;
        b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0;
        g = c;
        b = x;
    } else if (h >= 180 && h < 240) {
        r = 0;
        g = x;
        b = c;
    } else if (h >= 240 && h < 300) {
        r = x;
        g = 0;
        b = c;
    } else {
        r = c;
        g = 0;
        b = x;
    }

    const toHex = (value: number) =>
        Math.round((value + m) * 255)
            .toString(16)
            .padStart(2, "0");

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const presetColors = ["#f59e0b", "#22c55e", "#6366f1", "#f472b6", "#06b6d4", "#eab308"];

export function CustomizePanel({ displayNameProps, color, onColorChange }: CustomizePanelProps) {
    const [localName, setLocalName] = useState(displayNameProps?.currentDisplayName ?? "");
    const [localColor, setLocalColor] = useState(color);
    const [hsl, setHsl] = useState<HslColor>(() => hexToHsl(color));

    useEffect(() => {
        if (!displayNameProps) return;
        setLocalName(displayNameProps.currentDisplayName);
    }, [displayNameProps]);

    useEffect(() => {
        setLocalColor(color);
        setHsl(hexToHsl(color));
    }, [color]);

    useEffect(() => {
        if (!displayNameProps) return;
        const trimmed = localName.trim();
        const previous = displayNameProps.currentDisplayName.trim();
        if (!trimmed || trimmed === previous) return;
        const handle = window.setTimeout(() => {
            displayNameProps.onSave(trimmed);
        }, 500);
        return () => clearTimeout(handle);
    }, [displayNameProps, localName]);

    const nameHelper = useMemo(() => {
        if (!displayNameProps) return null;
        if (displayNameProps.error) return displayNameProps.error;
        if (displayNameProps.isSaving) return "Saving...";
        if (localName.trim().length === 0) return "Display name cannot be empty.";
        if (localName.trim() !== displayNameProps.currentDisplayName.trim()) return "Autosaving changes…";
        return "Saved";
    }, [displayNameProps, localName]);

    const applyHue = (nextHue: number) => {
        const hue = clampHue(nextHue);
        const nextColor = hslToHex(hue, hsl.s || 80, hsl.l || 55);
        setHsl((prev) => ({ ...prev, h: hue }));
        setLocalColor(nextColor);
        onColorChange(nextColor);
    };

    const handleHexChange = (value: string) => {
        setLocalColor(value);
        if (!/^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(value.trim())) return;
        const normalized = value.startsWith("#") ? value : `#${value}`;
        const nextHsl = hexToHsl(normalized);
        setHsl(nextHsl);
        onColorChange(hslToHex(nextHsl.h, nextHsl.s, nextHsl.l));
    };

    return (
        <div className="h-full w-full bg-gradient-to-br from-[#0d2f45] via-[#0b2334] to-[#081724] text-white">
            <div className="h-full overflow-auto">
                <div className="min-w-[560px] p-6 space-y-5">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg backdrop-blur-sm">
                        <p className="text-sm uppercase tracking-[0.25em] text-white/70 font-semibold">Customize</p>
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-xl font-semibold">Make it feel like you</h2>
                            <div className="flex items-center gap-2 text-xs text-white/70">
                                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.75)]" />
                                Auto-save on
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-white/70">Display name</p>
                                    <h3 className="text-lg font-semibold">How friends see you</h3>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <input
                                    value={localName}
                                    onChange={(e) => setLocalName(e.target.value)}
                                    placeholder={displayNameProps?.usernameFallback ?? "Your name"}
                                    disabled={!displayNameProps}
                                    maxLength={50}
                                    className="w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-base shadow-inner placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-white/40 disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                                {displayNameProps ? (
                                    <p
                                        className={`text-xs ${
                                            displayNameProps.error
                                                ? "text-rose-300"
                                                : displayNameProps.isSaving || localName.trim() !== displayNameProps.currentDisplayName.trim()
                                                    ? "text-amber-200"
                                                    : "text-emerald-200"
                                        }`}
                                    >
                                        {nameHelper}
                                    </p>
                                ) : (
                                    <p className="text-xs text-white/60">Sign in to set a display name.</p>
                                )}
                            </div>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 shadow-lg space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-white/70">Cursor color</p>
                                    <h3 className="text-lg font-semibold">Pick your vibe</h3>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <div
                                    className="h-12 w-12 rounded-xl border border-white/20 shadow-inner"
                                    style={{ backgroundColor: localColor }}
                                />
                                <div className="flex-1 space-y-2">
                                    <input
                                        type="range"
                                        min={0}
                                        max={360}
                                        value={hsl.h}
                                        onChange={(e) => applyHue(Number(e.target.value))}
                                        className="w-full h-3 rounded-full appearance-none cursor-pointer accent-white/70 bg-white/10"
                                    />
                                    <div className="flex flex-wrap items-center gap-2">
                                        {presetColors.map((preset) => (
                                            <button
                                                key={preset}
                                                type="button"
                                                className={`h-7 w-7 rounded-full border border-white/40 shadow-sm transition-transform hover:scale-105 ${
                                                    preset === localColor ? "ring-2 ring-white/70" : ""
                                                }`}
                                                style={{ backgroundColor: preset }}
                                                onClick={() => {
                                                    setLocalColor(preset);
                                                    setHsl(hexToHsl(preset));
                                                    onColorChange(preset);
                                                }}
                                                aria-label={`Use ${preset} cursor color`}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs text-white/60">Hex</span>
                                <input
                                    value={localColor}
                                    onChange={(e) => handleHexChange(e.target.value)}
                                    className="flex-1 min-w-[160px] rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm shadow-inner placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-white/40"
                                    placeholder="#ffaa33"
                                    spellCheck={false}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
