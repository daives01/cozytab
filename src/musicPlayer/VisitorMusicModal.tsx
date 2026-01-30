import { Disc, Music, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RetroVolumeFader } from "../computer/VolumeSlider";
import { extractYouTubeId } from "../lib/youtube";
import type { RoomItem } from "../types";
import { useKeyboardSoundPreferences } from "../hooks/useKeyboardSoundSetting";
import { useEffect, useState } from "react";

export interface VisitorMusicModalProps {
    item: RoomItem;
    onClose: () => void;
}

export function VisitorMusicModal({ item, onClose }: VisitorMusicModalProps) {
    const { musicVolume, setMusicVolume } = useKeyboardSoundPreferences();
    const percent = Math.round(musicVolume * 100);
    const [title, setTitle] = useState<string | null>(null);
    const [isFetchingTitle, setIsFetchingTitle] = useState(false);
    const [copied, setCopied] = useState(false);

    const videoId = item.musicType === "youtube" && item.musicUrl ? extractYouTubeId(item.musicUrl) : null;
    const previewUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
    const isPlaying = Boolean(item.musicPlaying);
    const canCopy = Boolean(item.musicUrl);

    const handleCopyLink = async () => {
        if (!item.musicUrl) return;
        await navigator.clipboard.writeText(item.musicUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [onClose]);

    useEffect(() => {
        if (!videoId) {
            setTitle(null);
            setIsFetchingTitle(false);
            return;
        }
        let cancelled = false;
        const fetchTitle = async () => {
            setIsFetchingTitle(true);
            try {
                const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
                if (!response.ok) throw new Error("Unable to fetch title");
                const data = (await response.json()) as { title?: string | null };
                if (!cancelled) {
                    setTitle(typeof data?.title === "string" ? data.title : null);
                }
            } catch {
                if (!cancelled) setTitle(null);
            } finally {
                if (!cancelled) setIsFetchingTitle(false);
            }
        };
        void fetchTitle();
        return () => {
            cancelled = true;
        };
    }, [videoId]);

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <div className="relative w-full max-w-2xl font-hand" onClick={(e) => e.stopPropagation()}>
                <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[var(--shadow-8)]">
                    <div className="flex items-center justify-between border-b-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] px-8 py-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] shadow-[var(--shadow-2)]">
                                <Music className="h-6 w-6 text-[var(--color-foreground)]" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold leading-none text-[var(--color-foreground)]">Now Spinning</h2>
                                <p className="mt-1 text-sm font-medium text-[var(--color-muted-foreground)]">
                                    {isPlaying ? "Host is playing" : "Host paused"}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="group/btn flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none shadow-[var(--shadow-2)] cursor-pointer"
                            aria-label="Close music viewer"
                        >
                            <X className="h-5 w-5 text-[var(--color-foreground)]" />
                        </button>
                    </div>

                    <div className="grid gap-6 px-4 py-5 md:px-7 md:py-6 md:grid-cols-[0.7fr_0.3fr] items-stretch">
                        <div className="flex flex-col gap-5">
                            {/* Cover art and volume side by side */}
                            <div className="flex items-center justify-center gap-4">
                                <div className="relative flex items-center justify-center">
                                    <div
                                        className={`absolute flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                                            previewUrl ? "translate-x-10 rotate-6" : "translate-x-0"
                                        }`}
                                    >
                                        <div className="flex h-32 w-32 sm:h-44 sm:w-44 animate-[spin_6s_linear_infinite] items-center justify-center rounded-full border-4 border-[var(--color-foreground)] bg-black shadow-xl">
                                            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent" />
                                            <div className="absolute inset-4 rounded-full border border-[var(--color-foreground)]/25" />
                                            <div className="absolute inset-8 rounded-full border border-[var(--color-foreground)]/15" />
                                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-accent)] border-4 border-[var(--color-foreground)]/50">
                                                <div className="h-2 w-2 rounded-full bg-black" />
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative z-20 flex h-[14rem] w-[14rem] sm:h-[18rem] sm:w-[18rem] overflow-hidden rounded-2xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[var(--shadow-6-soft)] transition-transform duration-500 ${
                                            previewUrl ? "-rotate-2" : "rotate-0"
                                        }`}
                                    >
                                        {previewUrl && (
                                            <img
                                                src={previewUrl}
                                                alt="Track cover"
                                                className="h-full w-full object-cover"
                                                draggable={false}
                                            />
                                        )}
                                        {!previewUrl && (
                                            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--color-background)]">
                                                <Disc className="h-12 w-12 text-[var(--color-muted-foreground)] opacity-40" />
                                                <span className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] opacity-70">
                                                    Waiting for a track
                                                </span>
                                            </div>
                                        )}
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/22 to-transparent" />
                                    </div>
                                </div>

                                {/* Mobile volume fader - hidden on desktop */}
                                <div className="flex flex-col items-center justify-center gap-2 md:hidden">
                                    <RetroVolumeFader value={musicVolume} onChange={setMusicVolume} height={180} />
                                    <span className="rounded-md border-2 border-[var(--color-foreground)] bg-[var(--color-card)] px-3 py-1 text-xs font-bold font-mono text-[var(--color-foreground)] shadow-[var(--shadow-2)]">
                                        {percent}%
                                    </span>
                                </div>
                            </div>

                            {(title || isFetchingTitle) && (
                                <div className="space-y-3 text-center">
                                    <div className="text-xl font-black text-[var(--color-foreground)] leading-snug line-clamp-2">
                                        {title ? title : isFetchingTitle ? "Finding title..." : null}
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Button
                                    type="button"
                                    disabled={!canCopy}
                                    onClick={handleCopyLink}
                                    className={`w-full h-10 border-2 border-[var(--color-foreground)] text-xs font-black uppercase tracking-wide shadow-[var(--shadow-3-strong)] transition-all ${
                                        copied
                                            ? "bg-[var(--color-accent)] text-[var(--color-foreground)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
                                            : "bg-[var(--color-foreground)] text-[var(--color-background)] hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none"
                                    } disabled:opacity-50 disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-none`}
                                >
                                    {copied ? (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Copied!
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="mr-2 h-4 w-4" />
                                            Copy Link
                                        </>
                                    )}
                                </Button>
                                {!canCopy && (
                                    <div className="text-center text-[11px] font-medium text-[var(--color-muted-foreground)]">
                                        Host hasn&apos;t set a link yet
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Desktop only: larger volume fader in right column */}
                        <div className="hidden md:flex flex-col gap-5">
                            <div className="flex flex-1 flex-col items-center justify-center gap-4">
                                <RetroVolumeFader value={musicVolume} onChange={setMusicVolume} height={240} />
                                <span className="rounded-md border-2 border-[var(--color-foreground)] bg-[var(--color-card)] px-3 py-1 text-xs font-bold font-mono text-[var(--color-foreground)] shadow-[var(--shadow-2)]">
                                    {percent}%
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
