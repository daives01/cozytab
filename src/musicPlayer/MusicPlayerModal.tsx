import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trash2, Save, Disc, Link as LinkIcon, Music } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";
import { RetroVolumeFader } from "../computer/VolumeSlider";
import { useKeyboardSoundPreferences } from "../hooks/useKeyboardSoundSetting";

export interface MusicPlayerModalProps {
    item: RoomItem;
    onClose: () => void;
    onSave: (item: RoomItem) => void;
}

export function MusicPlayerModal({ item, onClose, onSave }: MusicPlayerModalProps) {
    const [musicUrl, setMusicUrl] = useState(item.musicUrl || "");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [title, setTitle] = useState<string | null>(null);
    const [isFetchingTitle, setIsFetchingTitle] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { musicVolume, setMusicVolume } = useKeyboardSoundPreferences();
    const percent = Math.round(musicVolume * 100);
    const originalUrl = item.musicUrl?.trim() ?? "";

    useEffect(() => {
        const trimmedUrl = musicUrl.trim();
        let cancelled = false;
        const resetPreview = () => {
            if (cancelled) return;
            setPreviewUrl(null);
            setTitle(null);
            setIsFetchingTitle(false);
        };

        if (!trimmedUrl) {
            resetPreview();
            setError(null);
            return;
        }

        const videoId = extractYouTubeId(trimmedUrl);
        if (videoId) {
            setPreviewUrl(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`);
            setTitle(null);
            const fetchTitle = async () => {
                setIsFetchingTitle(true);
                try {
                    const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
                    if (!response.ok) throw new Error("Unable to fetch title");
                    const data = await response.json();
                    if (!cancelled) {
                        setTitle(typeof data?.title === "string" ? data.title : null);
                    }
                } catch {
                    if (!cancelled) setTitle(null);
                } finally {
                    if (!cancelled) setIsFetchingTitle(false);
                }
            };
            fetchTitle();
            setError(null);
        } else {
            resetPreview();
            setError("Invalid YouTube URL");
        }
        return () => {
            cancelled = true;
        };
    }, [musicUrl]);

    const handleSave = () => {
        const trimmedUrl = musicUrl.trim();
        const unchanged = trimmedUrl === originalUrl;

        if (unchanged) {
            onClose();
            return;
        }

        if (!trimmedUrl) {
            setError("Please enter a YouTube URL.");
            return;
        }
        if (!extractYouTubeId(trimmedUrl)) {
            setError("Invalid YouTube URL.");
            return;
        }

        const updatedItem: RoomItem = {
            ...item,
            musicUrl: trimmedUrl,
            musicType: "youtube",
            musicPlaying: true,
            musicStartedAt: Date.now() + 1000,
            musicPositionAtStart: 0,
        };
        onSave(updatedItem);
        onClose();
    };

    const handleClear = () => {
        const updatedItem: RoomItem = {
            ...item,
            musicUrl: undefined,
            musicType: undefined,
            musicPlaying: undefined,
            musicStartedAt: undefined,
            musicPositionAtStart: undefined,
        };
        // Persist cleared state externally but keep the modal open
        onSave(updatedItem);
        // Clear only the input/UI state, not close the modal
        setMusicUrl("");
        setPreviewUrl(null);
        setTitle(null);
        setError(null);
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

    return (
        <div
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl font-hand group"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="relative overflow-hidden rounded-3xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[var(--shadow-8)]">
                    <div className="flex items-center justify-between border-b-2 border-[var(--color-foreground)] bg-[var(--color-secondary)] px-8 py-6">
                        <div className="flex items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] shadow-[var(--shadow-2)]">
                                <Music className="h-6 w-6 text-[var(--color-foreground)]" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black leading-tight text-[var(--color-foreground)]">Now Spinning</h2>
                                <p className="mt-1 text-sm font-medium text-[var(--color-muted-foreground)]">Curate the room's vibe</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="group/btn flex h-10 w-10 items-center justify-center rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none shadow-[var(--shadow-2)] cursor-pointer"
                            aria-label="Close music modal"
                        >
                            <X className="h-5 w-5 text-[var(--color-foreground)]" />
                        </button>
                    </div>

                    <div className="flex gap-4 px-4 py-6 sm:gap-6 sm:px-7 items-stretch">
                        <div className="flex min-w-0 flex-1 flex-col gap-5">
                            <div className="relative flex flex-1 min-h-[16rem] sm:min-h-[20rem] items-center justify-center">
                                <div className="relative flex items-center justify-center scale-75 sm:scale-100">
                                    <div
                                        className={`absolute flex items-center justify-center transition-all duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
                                            previewUrl ? "translate-x-16 rotate-6" : "translate-x-0"
                                        }`}
                                    >
                                        <div className="flex h-52 w-52 animate-[spin_6s_linear_infinite] items-center justify-center rounded-full border-4 border-[var(--color-foreground)] bg-[var(--vinyl-primary)] shadow-[var(--shadow-6-soft)]">
                                            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-white/10 to-transparent" />
                                            <div className="absolute inset-4 rounded-full border border-[var(--color-foreground)]/20" />
                                            <div className="absolute inset-8 rounded-full border border-[var(--color-foreground)]/20" />
                                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-accent)] border-4 border-[var(--color-foreground)]/50">
                                                <div className="h-2 w-2 rounded-full bg-black" />
                                            </div>
                                        </div>
                                    </div>

                                    <div
                                        className={`relative z-20 flex h-[19rem] w-[19rem] overflow-hidden rounded-2xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] shadow-[var(--shadow-6-soft)] transition-transform duration-500 ${
                                            previewUrl ? "-rotate-2" : "rotate-0"
                                        }`}
                                    >
                                        {previewUrl && !error ? (
                                            <img
                                                src={previewUrl}
                                                alt="Track cover"
                                                className="h-full w-full object-cover"
                                                draggable={false}
                                            />
                                        ) : (
                                            <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--color-background)]">
                                                <Disc className="h-12 w-12 text-[var(--color-muted-foreground)] opacity-30" />
                                                <span className="text-sm font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] opacity-50">
                                                    No Disc
                                                </span>
                                            </div>
                                        )}
                                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 text-center px-2 sm:px-4">
                                <div className="text-xl sm:text-2xl font-black text-[var(--color-foreground)] leading-snug line-clamp-2">
                                    {title ? title : isFetchingTitle ? "Finding title..." : "Enter a YouTube link below"}
                                </div>
                            </div>

                            <div className="space-y-3 px-1">
                                <div className="relative">
                                    <div className="absolute -top-3 left-4 z-10 -rotate-1 rounded-md border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] px-2 py-0.5 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                        Source URL
                                    </div>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
                                        <Input
                                            placeholder="https://youtube.com/watch?v=..."
                                            value={musicUrl}
                                            onChange={(e) => setMusicUrl(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") {
                                                    e.preventDefault();
                                                    handleSave();
                                                }
                                            }}
                                            className="h-10 sm:h-12 border-2 border-[var(--color-foreground)] bg-[var(--color-background)] pl-10 sm:pl-12 pr-4 text-sm sm:text-base font-medium font-mono placeholder:font-mono shadow-[var(--shadow-4-soft)] transition-all focus-visible:-translate-y-0.5 focus-visible:ring-0 focus-visible:shadow-[var(--shadow-4)]"
                                        />
                                    </div>
                                </div>
                                {error && (
                                    <div className="ml-2 flex items-center gap-1 text-xs font-bold text-[var(--color-destructive)]">
                                        <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-destructive)]" />
                                        {error}
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 sm:gap-3 px-1">
                                {item.musicUrl && (
                                    <Button
                                        variant="ghost"
                                        onClick={handleClear}
                                        className="h-10 sm:h-11 flex-1 border-2 border-transparent text-xs sm:text-sm font-bold uppercase tracking-wide text-[var(--color-destructive)] transition-all hover:border-[var(--color-destructive)] hover:bg-[var(--color-destructive)]/10 cursor-pointer"
                                    >
                                        <Trash2 className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 w-5" />
                                        Eject
                                    </Button>
                                )}
                                <Button
                                    onClick={handleSave}
                                    disabled={!musicUrl.trim() || !!error}
                                    className="h-10 sm:h-11 flex-[2] border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] text-[var(--color-foreground)] font-black text-sm sm:text-base uppercase tracking-wide shadow-[var(--shadow-4-strong)] transition-all hover:translate-x-[4px] hover:translate-y-[4px] hover:shadow-none disabled:translate-x-0 disabled:translate-y-0 disabled:opacity-50 disabled:shadow-none cursor-pointer"
                                >
                                    <Save className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 w-5" />
                                    Spin
                                </Button>
                            </div>
                        </div>

                        <div className="flex shrink-0 flex-col gap-5">
                            <div className="flex flex-1 flex-col items-center justify-center gap-4">
                                <RetroVolumeFader value={musicVolume} onChange={setMusicVolume} height={320} />
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