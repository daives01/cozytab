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
    allowColorChange?: boolean;
}

export function CustomizePanel({
    displayNameProps,
    color,
    onColorChange,
    allowColorChange = true,
}: CustomizePanelProps) {
    const [localName, setLocalName] = useState(displayNameProps?.currentDisplayName ?? "");
    const [hasTyped, setHasTyped] = useState(false);
    const hsl = useMemo<HslColor>(() => hexToHsl(color), [color]);

    const safeHue = clampHue(hsl.h ?? 0);
    const safeSaturation = hsl.s ?? 80;
    const safeLightness = Math.max(30, Math.min(90, hsl.l ?? 55));

    const brightnessGradient = useMemo(
        () =>
            `linear-gradient(90deg, hsl(${safeHue}, 80%, 25%), hsl(${safeHue}, 90%, 60%), hsl(${safeHue}, 90%, 90%))`,
        [safeHue]
    );

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

    useEffect(() => {
        if (!displayNameProps) return;
        const handle = window.setTimeout(() => {
            setLocalName(displayNameProps.currentDisplayName ?? "");
            setHasTyped(false);
        }, 0);
        return () => clearTimeout(handle);
    }, [displayNameProps]);

    const applyHue = (nextHue: number) => {
        if (!allowColorChange) return;
        const hue = clampHue(nextHue);
        const nextColor = hslToHex(hue, safeSaturation, safeLightness);
        onColorChange(nextColor);
    };

    const applyLightness = (nextLightness: number) => {
        if (!allowColorChange) return;
        const l = Math.max(30, Math.min(90, nextLightness));
        const nextColor = hslToHex(safeHue, safeSaturation, l);
        onColorChange(nextColor);
    };

    return (
        <div className="h-full w-full">
            <div className="h-full overflow-auto">
                <div className="min-w-[560px] p-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="bg-[var(--card)] border border-[color-mix(in_srgb,var(--ink)_8%,transparent)] rounded-2xl p-4 shadow-md space-y-2 text-[var(--ink)]">
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
                                className="w-full rounded-xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[var(--card)] px-3 py-2.5 text-base shadow-inner placeholder:text-[color-mix(in_srgb,var(--ink-subtle)_70%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--warning)] focus:border-[color-mix(in_srgb,var(--ink)_20%,transparent)] disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                            {displayNameProps?.error ? (
                                <p className="text-xs text-[var(--danger-dark)]">{displayNameProps.error}</p>
                            ) : null}
                            {!displayNameProps ? <p className="text-xs text-[var(--ink-subtle)]">Sign in to set a display name.</p> : null}
                        </div>

                        <div className="bg-[var(--card)] border border-[color-mix(in_srgb,var(--ink)_8%,transparent)] rounded-2xl p-4 shadow-md space-y-3 text-[var(--ink)]">
                            <h3 className="text-lg font-semibold">Cursor color</h3>
                            {!allowColorChange ? (
                                <p className="text-xs text-[var(--ink-subtle)]">
                                    Sign in to adjust your cursor color.
                                </p>
                            ) : null}

                            <div className={`space-y-2 ${!allowColorChange ? "opacity-60" : ""}`}>
                                <p className="text-xs text-[var(--ink-subtle)]">Hue</p>
                                <input
                                    aria-label="Hue"
                                    type="range"
                                    min={0}
                                    max={360}
                                    value={safeHue}
                                    onChange={(e) => applyHue(Number(e.target.value))}
                                    disabled={!allowColorChange}
                                    className="w-full h-3 rounded-full appearance-none cursor-pointer shadow-inner disabled:cursor-not-allowed"
                                    style={{
                                        background:
                                            "linear-gradient(90deg, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
                                    }}
                                />
                            </div>

                            <div className={`space-y-2 ${!allowColorChange ? "opacity-60" : ""}`}>
                                <p className="text-xs text-[var(--ink-subtle)]">Brightness</p>
                                <input
                                    aria-label="Glow"
                                    type="range"
                                    min={30}
                                    max={90}
                                    value={safeLightness}
                                    onChange={(e) => applyLightness(Number(e.target.value))}
                                    disabled={!allowColorChange}
                                    className="w-full h-3 rounded-full appearance-none cursor-pointer shadow-inner disabled:cursor-not-allowed"
                                    style={{
                                        background: brightnessGradient,
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
