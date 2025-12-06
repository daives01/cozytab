import { useEffect, useMemo, useState } from "react";
import { clampHue, hexToHsl, hslToHex, type HslColor } from "../utils/cursorColor";

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

export function CustomizePanel({ displayNameProps, color, onColorChange }: CustomizePanelProps) {
    const [localName, setLocalName] = useState(displayNameProps?.currentDisplayName ?? "");
    const [hasTyped, setHasTyped] = useState(false);
    const hsl = useMemo<HslColor>(() => hexToHsl(color), [color]);

    useEffect(() => {
        if (!displayNameProps) return;
        const trimmed = localName.trim();
        const previous = displayNameProps.currentDisplayName.trim();
        const fallback = displayNameProps.usernameFallback ?? displayNameProps.currentDisplayName ?? "";
        const target = trimmed || fallback;
        if (target.trim() === previous) return;
        const handle = window.setTimeout(() => {
            displayNameProps.onSave(target);
        }, 500);
        return () => clearTimeout(handle);
    }, [displayNameProps, localName]);

    const applyHue = (nextHue: number) => {
        const hue = clampHue(nextHue);
        const nextColor = hslToHex(hue, hsl.s || 80, hsl.l || 55);
        onColorChange(nextColor);
    };

    const applyLightness = (nextLightness: number) => {
        const l = Math.max(30, Math.min(90, nextLightness));
        const nextColor = hslToHex(hsl.h || 200, hsl.s || 80, l);
        onColorChange(nextColor);
    };

    return (
        <div className="h-full w-full">
            <div className="h-full overflow-auto">
                <div className="min-w-[560px] p-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="bg-white border border-black/5 rounded-2xl p-4 shadow-md space-y-2 text-[var(--ink,#0f172a)]">
                            <h3 className="text-lg font-semibold">Display name</h3>
                            <input
                                value={hasTyped ? localName : displayNameProps?.currentDisplayName ?? ""}
                                onChange={(e) => {
                                    setHasTyped(true);
                                    setLocalName(e.target.value);
                                }}
                                placeholder={displayNameProps?.usernameFallback ?? "Your name"}
                                disabled={!displayNameProps}
                                maxLength={50}
                                className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-base shadow-inner placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-black/20 disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                            {displayNameProps?.error ? (
                                <p className="text-xs text-rose-500">{displayNameProps.error}</p>
                            ) : null}
                            {!displayNameProps ? <p className="text-xs text-slate-600">Sign in to set a display name.</p> : null}
                        </div>

                        <div className="bg-white border border-black/5 rounded-2xl p-4 shadow-md space-y-3 text-[var(--ink,#0f172a)]">
                            <h3 className="text-lg font-semibold">Cursor color</h3>

                            <div className="space-y-2">
                                <p className="text-xs text-slate-600">Hue</p>
                                <input
                                    aria-label="Hue"
                                    type="range"
                                    min={0}
                                    max={360}
                                    value={hsl.h}
                                    onChange={(e) => applyHue(Number(e.target.value))}
                                    className="w-full h-3 rounded-full appearance-none cursor-pointer shadow-inner"
                                    style={{
                                        background:
                                            "linear-gradient(90deg, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
                                    }}
                                />
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs text-slate-600">Brightness</p>
                                <input
                                    aria-label="Glow"
                                    type="range"
                                    min={30}
                                    max={90}
                                    value={hsl.l}
                                    onChange={(e) => applyLightness(Number(e.target.value))}
                                    className="w-full h-3 rounded-full appearance-none cursor-pointer shadow-inner"
                                    style={{
                                        background: `linear-gradient(90deg, hsl(${hsl.h}, 80%, 25%), hsl(${hsl.h}, 90%, 60%), hsl(${hsl.h}, 90%, 90%))`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
