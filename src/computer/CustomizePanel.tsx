import { useEffect, useMemo, useState, useRef, useEffectEvent } from "react";
import { clampHue, hexToHsl, hslToHex, type HslColor } from "@/room/utils/cursorColor";

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
    return (
        <div className="h-full w-full">
            <div className="h-full overflow-auto">
                <div className="min-w-[560px] p-6 space-y-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <DisplayNameCard props={displayNameProps} />
                        <CursorColorCard 
                            color={color} 
                            onColorChange={onColorChange} 
                            disabled={!allowColorChange} 
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function DisplayNameCard({ props }: { props?: DisplayNameSectionProps }) {
    const [localName, setLocalName] = useState(props?.currentDisplayName ?? "");
    const lastSavedValue = useRef(props?.currentDisplayName ?? "");

    const syncRemoteName = useEffectEvent((nextName: string) => {
        setLocalName(nextName);
        lastSavedValue.current = nextName;
    });

    // Sync local state when the authoritative name changes (e.g., from DB or other tab)
    useEffect(() => {
        if (props?.currentDisplayName === undefined) return;
        if (props.currentDisplayName === lastSavedValue.current) return;
        syncRemoteName(props.currentDisplayName);
    }, [props?.currentDisplayName]);

    // Debounce the save operation
    useEffect(() => {
        if (!props) return;

        const trimmed = localName.trim();
        const fallback = props.usernameFallback ?? props.currentDisplayName ?? "";
        const target = trimmed || fallback;
        
        // Only trigger a save if the target differs from the current authoritative value
        if (target === props.currentDisplayName) return;

        const timer = setTimeout(() => {
            lastSavedValue.current = target;
            props.onSave(target);
        }, 500);

        return () => clearTimeout(timer);
    }, [localName, props]);

    return (
        <div className="bg-[var(--card)] border border-[color-mix(in_srgb,var(--ink)_8%,transparent)] rounded-2xl p-4 shadow-md space-y-2 text-[var(--ink)]">
            <h3 className="text-lg font-semibold">Display name</h3>
            <input
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                placeholder={props?.usernameFallback ?? "Your name"}
                disabled={!props}
                maxLength={50}
                className="w-full rounded-xl border border-[color-mix(in_srgb,var(--ink)_10%,transparent)] bg-[var(--card)] px-3 py-2.5 text-base shadow-inner placeholder:text-[color-mix(in_srgb,var(--ink-subtle)_70%,transparent)] focus:outline-none focus:ring-2 focus:ring-[var(--warning)] focus:border-[color-mix(in_srgb,var(--ink)_20%,transparent)] disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {props?.error && (
                <p className="text-xs text-[var(--danger-dark)] mt-1">{props.error}</p>
            )}
            {!props && (
                <p className="text-xs text-[var(--ink-subtle)] mt-1">Sign in to set a display name.</p>
            )}
        </div>
    );
}

function CursorColorCard({ 
    color, 
    onColorChange, 
    disabled 
}: { 
    color: string; 
    onColorChange: (next: string) => void; 
    disabled: boolean;
}) {
    const hsl = useMemo<HslColor>(() => hexToHsl(color), [color]);

    const safeHue = clampHue(hsl.h ?? 0);
    const safeSaturation = hsl.s ?? 80;
    const safeLightness = Math.max(30, Math.min(90, hsl.l ?? 55));

    const brightnessGradient = useMemo(
        () =>
            `linear-gradient(90deg, hsl(${safeHue}, 80%, 25%), hsl(${safeHue}, 90%, 60%), hsl(${safeHue}, 90%, 90%))`,
        [safeHue]
    );

    const applyHue = (nextHue: number) => {
        if (disabled) return;
        const hue = clampHue(nextHue);
        onColorChange(hslToHex(hue, safeSaturation, safeLightness));
    };

    const applyLightness = (nextLightness: number) => {
        if (disabled) return;
        const l = Math.max(30, Math.min(90, nextLightness));
        onColorChange(hslToHex(safeHue, safeSaturation, l));
    };

    return (
        <div className="bg-[var(--card)] border border-[color-mix(in_srgb,var(--ink)_8%,transparent)] rounded-2xl p-4 shadow-md space-y-3 text-[var(--ink)]">
            <h3 className="text-lg font-semibold">Cursor color</h3>
            {disabled && (
                <p className="text-xs text-[var(--ink-subtle)]">
                    Sign in to adjust your cursor color.
                </p>
            )}

            <div className={`space-y-2 ${disabled ? "opacity-60" : ""}`}>
                <p className="text-xs text-[var(--ink-subtle)]">Hue</p>
                <input
                    aria-label="Hue"
                    type="range"
                    min={0}
                    max={360}
                    value={safeHue}
                    onChange={(e) => applyHue(Number(e.target.value))}
                    disabled={disabled}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer shadow-inner disabled:cursor-not-allowed"
                    style={{
                        background:
                            "linear-gradient(90deg, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)",
                    }}
                />
            </div>

            <div className={`space-y-2 ${disabled ? "opacity-60" : ""}`}>
                <p className="text-xs text-[var(--ink-subtle)]">Brightness</p>
                <input
                    aria-label="Glow"
                    type="range"
                    min={30}
                    max={90}
                    value={safeLightness}
                    onChange={(e) => applyLightness(Number(e.target.value))}
                    disabled={disabled}
                    className="w-full h-3 rounded-full appearance-none cursor-pointer shadow-inner disabled:cursor-not-allowed"
                    style={{
                        background: brightnessGradient,
                    }}
                />
            </div>
        </div>
    );
}
