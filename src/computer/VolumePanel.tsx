import { useEffect } from "react";
import { Volume2, VolumeX, Music, Keyboard } from "lucide-react";
import { RetroVolumeFader } from "./VolumeSlider";
import { useRef } from "react";

interface VolumePanelProps {
    isOpen: boolean;
    onClose: () => void;
    keyboardVolume: number;
    musicVolume: number;
    onKeyboardVolumeChange: (val: number) => void;
    onMusicVolumeChange: (val: number) => void;
}

export function VolumePanel({
    isOpen,
    onClose,
    keyboardVolume,
    musicVolume,
    onKeyboardVolumeChange,
    onMusicVolumeChange,
}: VolumePanelProps) {
    const DEFAULT_RETURN_VOLUME = 0.5;
    const lastKeyboardVolume = useRef<number | null>(null);
    const lastMusicVolume = useRef<number | null>(null);
    const keyboardPercent = Math.round(keyboardVolume * 100);
    const musicPercent = Math.round(musicVolume * 100);
    const MusicIcon = musicVolume === 0 ? VolumeX : Music;

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [isOpen, onClose]);

    // Track last non-zero volumes while the panel is open so mute/unmute can restore.
    useEffect(() => {
        if (!isOpen) {
            lastKeyboardVolume.current = null;
            lastMusicVolume.current = null;
            return;
        }
        if (keyboardVolume > 0) {
            lastKeyboardVolume.current = keyboardVolume;
        }
        if (musicVolume > 0) {
            lastMusicVolume.current = musicVolume;
        }
    }, [isOpen, keyboardVolume, musicVolume]);

    const toggleKeyboardMute = () => {
        if (keyboardVolume === 0) {
            onKeyboardVolumeChange(lastKeyboardVolume.current ?? DEFAULT_RETURN_VOLUME);
        } else {
            lastKeyboardVolume.current = keyboardVolume || lastKeyboardVolume.current || DEFAULT_RETURN_VOLUME;
            onKeyboardVolumeChange(0);
        }
    };

    const toggleMusicMute = () => {
        if (musicVolume === 0) {
            onMusicVolumeChange(lastMusicVolume.current ?? DEFAULT_RETURN_VOLUME);
        } else {
            lastMusicVolume.current = musicVolume || lastMusicVolume.current || DEFAULT_RETURN_VOLUME;
            onMusicVolumeChange(0);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="absolute bottom-14 right-4 z-[120] w-72 select-none font-['Patrick_Hand']"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="overflow-hidden rounded-2xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[8px_8px_0px_0px_var(--color-foreground)] animate-in slide-in-from-bottom-2 fade-in duration-200">
                <div className="flex items-center gap-2 border-b-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] px-3 py-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] shadow-[2px_2px_0px_0px_var(--color-foreground)]">
                        <Volume2 className="h-3.5 w-3.5 text-[var(--color-foreground)]" />
                    </div>
                    <span className="text-sm font-bold uppercase tracking-wide text-[var(--color-foreground)]">
                        Volume
                    </span>
                </div>

                <div className="bg-[var(--color-background)] p-4">
                    <div className="flex justify-between gap-4">
                        <div className="flex flex-1 flex-col items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-card)] shadow-sm">
                                <Keyboard className="h-5 w-5 text-[var(--color-foreground)]" />
                            </div>

                            <RetroVolumeFader
                                value={keyboardVolume}
                                onChange={onKeyboardVolumeChange}
                                muted={keyboardVolume === 0}
                            />

                            <span className="min-w-[2.5rem] rounded-md border-2 border-[var(--color-foreground)] bg-[var(--color-card)] py-0.5 text-center text-xs font-bold font-mono text-[var(--color-foreground)]">
                                {keyboardPercent}%
                            </span>

                            <button
                                onClick={toggleKeyboardMute}
                                aria-label={keyboardVolume === 0 ? "Unmute keyboard" : "Mute keyboard"}
                                className="flex items-center justify-center gap-2 rounded-md border-2 border-[var(--color-foreground)] bg-[var(--color-background)] px-3 py-1 shadow-[3px_3px_0px_0px_var(--color-foreground)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                            >
                                {keyboardVolume === 0 ? (
                                    <VolumeX className="h-4 w-4" />
                                ) : (
                                    <Volume2 className="h-4 w-4" />
                                )}
                            </button>
                        </div>

                        <div className="w-0.5 self-stretch rounded-full bg-[var(--color-foreground)] opacity-10" />

                        <div className="flex flex-1 flex-col items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-card)] shadow-sm">
                                <MusicIcon className="h-5 w-5 text-[var(--color-foreground)]" />
                            </div>

                            <RetroVolumeFader
                                value={musicVolume}
                                onChange={onMusicVolumeChange}
                                muted={musicVolume === 0}
                            />

                            <span className="min-w-[2.5rem] rounded-md border-2 border-[var(--color-foreground)] bg-[var(--color-card)] py-0.5 text-center text-xs font-bold font-mono text-[var(--color-foreground)]">
                                {musicPercent}%
                            </span>

                            <button
                                onClick={toggleMusicMute}
                                aria-label={musicVolume === 0 ? "Unmute music" : "Mute music"}
                                className="flex items-center justify-center gap-2 rounded-md border-2 border-[var(--color-foreground)] bg-[var(--color-background)] px-3 py-1 shadow-[3px_3px_0px_0px_var(--color-foreground)] transition-transform active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                            >
                                {musicVolume === 0 ? (
                                    <VolumeX className="h-4 w-4" />
                                ) : (
                                    <Volume2 className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
