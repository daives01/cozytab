import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Music } from "lucide-react";
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
            setPreviewUrl(null);
            setError(null);
            return;
        }

        const videoId = extractYouTubeId(musicUrl);
        if (videoId) {
            setPreviewUrl(`https://www.youtube.com/embed/${videoId}?autoplay=0&controls=1&enablejsapi=1`);
            setError(null);
        } else {
            setPreviewUrl(null);
            setError("Invalid YouTube URL. Please use a valid YouTube video URL.");
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

        const updatedItem: RoomItem = {
            ...item,
            musicUrl: musicUrl.trim(),
            musicType: "youtube",
        };

        onSave(updatedItem);
        onClose();
    };

    const handleClear = () => {
        const updatedItem: RoomItem = {
            ...item,
            musicUrl: undefined,
            musicType: undefined,
        };
        onSave(updatedItem);
        onClose();
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center font-['Patrick_Hand']"
            onClick={onClose}
        >
            <div
                className="bg-background border-4 border-foreground rounded-lg shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] w-[90vw] max-w-2xl h-[80vh] max-h-[600px] flex flex-col p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold flex items-center gap-2">
                        <Music className="h-8 w-8" />
                        Configure Music Player
                    </h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    {/* URL Input */}
                    <div>
                        <label className="block text-lg font-bold mb-2">
                            YouTube Video URL
                        </label>
                        <Input
                            placeholder="https://www.youtube.com/watch?v=..."
                            value={musicUrl}
                            onChange={(e) => setMusicUrl(e.target.value)}
                            className="font-['Patrick_Hand']"
                        />
                        <p className="text-sm text-muted-foreground mt-2">
                            Paste any YouTube video URL
                        </p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="p-3 bg-destructive/10 border-2 border-destructive rounded text-destructive text-sm">
                            {error}
                        </div>
                    )}

                    {/* Preview */}
                    {previewUrl && !error && (
                        <div>
                            <label className="block text-lg font-bold mb-2">Preview</label>
                            <Card className="p-2">
                                <div className="aspect-video w-full">
                                    <iframe
                                        src={previewUrl}
                                        className="w-full h-full rounded"
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            </Card>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="mt-6 pt-4 border-t border-border flex gap-3">
                    {item.musicUrl && (
                        <Button
                            variant="outline"
                            onClick={handleClear}
                            className="flex-1"
                        >
                            Clear Music
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={onClose}
                        className="flex-1"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={!musicUrl.trim() || !!error}
                        className="flex-1"
                    >
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
}
