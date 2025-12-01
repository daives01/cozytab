import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Eye } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";

interface MusicPlayerButtonsProps {
    item: RoomItem;
    scale: number;
    isPlaying: boolean;
    onPlayingChange: (playing: boolean) => void;
    onChange?: (item: RoomItem) => void;
}

export function MusicPlayerButtons({ item, isPlaying, onPlayingChange, onChange }: MusicPlayerButtonsProps) {
    const videoId = item.musicUrl && item.musicType === "youtube" ? extractYouTubeId(item.musicUrl) : null;

    // Listen for YouTube API state changes from the iframe in InlineMusicPlayer
    // Note: We share state with InlineMusicPlayer via props, so we listen to update the shared state
    useEffect(() => {
        if (!videoId) return;
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== "https://www.youtube.com") return;
            
            try {
                const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
                
                // Check if this message is from the iframe for this video
                const iframes = document.querySelectorAll('iframe[src*="youtube.com/embed"]');
                const targetIframe = Array.from(iframes).find((iframe) => {
                    const src = (iframe as HTMLIFrameElement).src;
                    return src.includes(videoId);
                });
                
                // Only process if it's from our video's iframe
                if (targetIframe && event.source !== (targetIframe as HTMLIFrameElement).contentWindow) {
                    return;
                }
                
                // Handle state changes from YouTube player
                if (data.event === "onStateChange") {
                    // 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued
                    const playing = data.info === 1;
                    onPlayingChange(playing);
                }
            } catch {
                // Ignore parse errors
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [onPlayingChange, videoId]);

    if (!item.musicUrl || item.musicType !== "youtube" || !videoId) {
        return null;
    }

    // Only show buttons when video is hidden
    if (item.videoVisible !== false) {
        return null;
    }

    // Control YouTube iframe playback via postMessage
    // Note: We need to control the iframe in InlineMusicPlayer, not this one
    // So we'll need to share the iframe ref or use a different approach
    // For now, we'll need to find the iframe from InlineMusicPlayer
    const sendCommand = (command: string) => {
        // Find the iframe in the InlineMusicPlayer component
        // Since we can't directly access it, we'll need to use a shared approach
        // For now, try to find it in the DOM
        const iframes = document.querySelectorAll('iframe[src*="youtube.com/embed"]');
        const targetIframe = Array.from(iframes).find((iframe) => {
            const src = (iframe as HTMLIFrameElement).src;
            return src.includes(videoId);
        }) as HTMLIFrameElement | undefined;

        if (targetIframe?.contentWindow) {
            targetIframe.contentWindow.postMessage(
                JSON.stringify({
                    event: "command",
                    func: command,
                    args: "",
                }),
                "https://www.youtube.com"
            );
        }
    };

    const handlePlayPause = () => {
        // If currently playing, pause it; if paused, play it
        if (isPlaying) {
            sendCommand("pauseVideo");
            // Optimistically update state (will be confirmed by YouTube event)
            onPlayingChange(false);
        } else {
            sendCommand("playVideo");
            // Optimistically update state (will be confirmed by YouTube event)
            onPlayingChange(true);
        }
    };

    const handleShowVideo = () => {
        if (onChange) {
            onChange({
                ...item,
                videoVisible: true,
            });
        }
    };

    // Position buttons below the vinyl player
    // Note: Dimensions in room space (unscaled) - container transform handles scaling
    const offsetY = 70;

    return (
        <>
            {/* Buttons */}
            <div
                className="absolute pointer-events-auto"
                style={{
                    left: item.x,
                    top: item.y + offsetY,
                    transform: "translate(-50%, 0)",
                    zIndex: item.zIndex + 1,
                }}
            >
                <div className="flex items-center justify-center gap-3">
                    <Button
                        size="icon"
                        variant="default"
                        className="h-10 w-10 rounded-full shadow-lg hover:scale-105 transition-transform"
                        onClick={handlePlayPause}
                        title={isPlaying ? "Pause" : "Play"}
                    >
                        {isPlaying ? (
                            <Pause className="h-5 w-5" />
                        ) : (
                            <Play className="h-5 w-5" />
                        )}
                    </Button>
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-full border-2 shadow-lg bg-background hover:scale-105 transition-transform"
                        onClick={handleShowVideo}
                        title="Show video"
                    >
                        <Eye className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </>
    );
}

