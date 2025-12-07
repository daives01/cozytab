import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trash2, Save, PlayCircle, Disc } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";

interface MusicPlayerModalProps {
    item: RoomItem;
    onClose: () => void;
    onSave: (item: RoomItem) => void;
}

export function MusicPlayerModal({ item, onClose, onSave }: MusicPlayerModalProps) {
    const [musicUrl, setMusicUrl] = useState(item.musicUrl || "");
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!musicUrl.trim()) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPreviewUrl(null);
            setError(null);
            return;
        }

        const videoId = extractYouTubeId(musicUrl);
        if (videoId) {
            setPreviewUrl(`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&enablejsapi=1&modestbranding=1`);
            setError(null);
        } else {
            setPreviewUrl(null);
            setError("Invalid YouTube URL");
        }
    }, [musicUrl]);

    const handleSave = () => {
        if (!musicUrl.trim()) {
            setError("Please enter a YouTube URL.");
            return;
        }

        if (!extractYouTubeId(musicUrl)) {
            setError("Invalid YouTube URL.");
            return;
        }

        const startedAt = Date.now();
        const updatedItem: RoomItem = {
            ...item,
            musicUrl: musicUrl.trim(),
            musicType: "youtube",
            musicPlaying: true,
            musicStartedAt: startedAt,
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

        onSave(updatedItem);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center font-['Patrick_Hand']"
            onClick={onClose}
        >
            <div
                className="bg-[var(--paper)] border-2 border-[var(--ink)] rounded-xl shadow-lg w-[90vw] max-w-2xl relative flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 w-full h-4 bg-[var(--warning)] border-b-2 border-[var(--ink)]/20" />

                <div className="flex items-center justify-between p-6 pt-10 pb-4 bg-[var(--paper-header)] border-b-2 border-[var(--ink)]">
                    <div className="flex flex-col">
                        <h2 className="text-4xl font-bold text-[var(--ink)] tracking-wide flex items-center gap-2">
                            <span className="text-[var(--warning)]">♫</span> Now Spinning
                        </h2>
                        <span className="text-[var(--ink-muted)] text-lg ml-1">
                            Set the room's vibe
                        </span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-10 w-10 hover:bg-[var(--warning-light)] rounded-full"
                    >
                        <X className="h-6 w-6 text-[var(--ink)]" />
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-4 space-y-8">
                    <div className="flex items-center justify-center h-48 py-2 relative">
                        <div
                            className={`absolute transition-all duration-700 ease-out flex items-center justify-center
                                ${previewUrl ? "translate-x-16 rotate-12" : "translate-x-0"}
                            `}
                        >
                            <div className="w-44 h-44 bg-[var(--vinyl-primary)] rounded-full shadow-xl border-4 border-[var(--ink)] flex items-center justify-center animate-[spin_6s_linear_infinite]">
                                <div className="absolute inset-1 border border-white/5 rounded-full" />
                                <div className="absolute inset-3 border border-white/5 rounded-full" />
                                <div className="absolute inset-6 border border-white/5 rounded-full" />
                                <div className="absolute inset-10 border border-white/5 rounded-full" />

                                <div className="w-16 h-16 bg-[var(--vinyl-label)] rounded-full border-2 border-white/20 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-black rounded-full" />
                                </div>
                            </div>
                        </div>

                        <div
                            className={`relative z-10 w-48 h-48 bg-[var(--card)] border-2 border-[color:color-mix(in_srgb,var(--ink)_20%,transparent)] shadow-2xl rounded-md overflow-hidden transition-transform duration-500
                                ${previewUrl ? "-rotate-2" : "rotate-0 bg-[var(--muted)] flex items-center justify-center"}
                            `}
                        >
                            {previewUrl && !error ? (
                                <iframe
                                    src={previewUrl}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="flex flex-col items-center text-muted-foreground/50">
                                    <Disc className="h-16 w-16 mb-2" />
                                    <span className="font-bold text-sm">No Disc</span>
                                </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                        </div>
                    </div>

                    <div className="bg-[var(--paper-header)] p-6 rounded-xl border-2 border-[var(--ink)] relative mt-8">
                        <div className="absolute -top-3 left-4 bg-[var(--warning)] text-white px-3 py-1 rounded-lg text-sm font-bold shadow-sm transform -rotate-2 border-2 border-[var(--ink)]">
                            TRACK URL
                        </div>

                        <div className="mt-2 space-y-4">
                            <div className="relative">
                                <PlayCircle className="absolute left-3 top-2.5 h-5 w-5 text-[var(--ink-subtle)]" />
                                <Input
                                    placeholder="Paste YouTube Link here..."
                                    value={musicUrl}
                                    onChange={(e) => setMusicUrl(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleSave();
                                    }
                                }}
                                    className="pl-10 bg-white border-2 border-[var(--ink)] focus-visible:ring-[var(--warning)] h-10 font-sans text-base"
                                />
                            </div>

                            {error && (
                                <div className="text-[var(--danger)] text-sm font-bold flex items-center gap-2 animate-pulse pl-1">
                                    <X className="h-4 w-4" /> {error}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-[var(--paper-header)] border-t-2 border-[var(--ink)] flex gap-4">
                    {item.musicUrl && (
                        <Button
                            variant="outline"
                            onClick={handleClear}
                            className="flex-1 border-2 border-[var(--danger)] text-[var(--danger)] hover:bg-[var(--danger-light)] hover:text-[var(--danger-dark)] font-bold"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eject
                        </Button>
                    )}

                    <Button
                        onClick={handleSave}
                        disabled={!musicUrl.trim() || !!error}
                        className="flex-1 bg-[var(--ink)] hover:bg-[var(--ink-light)] text-white border-2 border-[var(--ink)] font-bold text-lg shadow-md transition-all active:scale-95 active:shadow-sm active:translate-x-[2px] active:translate-y-[2px]"
                    >
                        <Save className="h-5 w-5 mr-2" />
                        Press Vinyl
                    </Button>
                </div>
            </div>
        </div>
    );
}
