import { useRef, useCallback, useState } from "react";
import { Play, Pause } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";

interface MusicPlayerButtonsProps {
    item: RoomItem;
}

export function MusicPlayerButtons({ item }: MusicPlayerButtonsProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);

    const videoId = item.musicUrl && item.musicType === "youtube" ? extractYouTubeId(item.musicUrl) : null;

    const embedUrl = videoId
        ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&fs=0&iv_load_policy=3&cc_load_policy=0&playsinline=1&loop=1&playlist=${videoId}&origin=${window.location.origin}`
        : null;

    const sendCommand = useCallback((command: string, args?: unknown) => {
        if (iframeRef.current?.contentWindow && isReady) {
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: "command", func: command, args: args ?? "" }),
                "https://www.youtube.com"
            );
        }
    }, [isReady]);

    const handleIframeLoad = useCallback(() => {
        setTimeout(() => setIsReady(true), 500);
    }, []);

    const handlePlayPause = () => {
        if (!isReady) return;

        if (isPlaying) {
            sendCommand("pauseVideo");
            setIsPlaying(false);
        } else {
            sendCommand("playVideo");
            setIsPlaying(true);
        }
    };

    if (!item.musicUrl || item.musicType !== "youtube" || !videoId || !embedUrl) {
        return null;
    }

    return (
        <>
            <iframe
                ref={iframeRef}
                src={embedUrl}
                style={{ width: 1, height: 1, opacity: 0, position: "absolute", left: -9999, top: -9999 }}
                allow="autoplay"
                onLoad={handleIframeLoad}
            />

            <div
                className="absolute pointer-events-auto"
                style={{
                    left: item.x,
                    top: item.y + 70,
                    transform: "translate(-50%, 0)",
                    zIndex: 11,
                }}
            >
                <button
                    className="font-['Patrick_Hand'] h-10 w-10 rounded-full border-4 border-emerald-600 bg-emerald-400 text-emerald-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:scale-105 active:scale-95 transition-transform -rotate-1 flex items-center justify-center"
                    onClick={handlePlayPause}
                    title={isPlaying ? "Pause" : "Play"}
                    disabled={!isReady}
                >
                    {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                </button>
            </div>
        </>
    );
}
