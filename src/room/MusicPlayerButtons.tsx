import { useRef, useCallback, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";

interface MusicPlayerButtonsProps {
    item: RoomItem;
    onToggle?: (playing: boolean) => void;
}

export function MusicPlayerButtons({ item, onToggle }: MusicPlayerButtonsProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const playing = item.musicPlaying ?? false;
    const needsResume = playing && !hasInteracted;

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

    useEffect(() => {
        if (isReady && playing && !needsResume) {
            sendCommand("playVideo");
        }
    }, [isReady, playing, needsResume, sendCommand]);

    useEffect(() => {
        if (isReady && !playing) {
            sendCommand("pauseVideo");
        }
    }, [isReady, playing, sendCommand]);

    const handlePlayPause = () => {
        if (!isReady) return;

        if (playing) {
            sendCommand("pauseVideo");
            onToggle?.(false);
        } else {
            setHasInteracted(true);
            sendCommand("playVideo");
            onToggle?.(true);
        }
    };

    const handleResume = () => {
        if (!isReady) return;
        setHasInteracted(true);
        sendCommand("playVideo");
        onToggle?.(true);
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

            {needsResume ? (
                <div className="absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 z-20 opacity-95 whitespace-nowrap">
                    <button
                        className="pointer-events-auto font-['Patrick_Hand'] text-sm px-4 py-2 rounded-full border-2 border-[var(--ink)] bg-white shadow-md hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleResume();
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        disabled={!isReady}
                    >
                        Listen in
                    </button>
                </div>
            ) : (
                <div className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 z-20 opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                    <button
                        className="pointer-events-auto font-['Patrick_Hand'] h-9 w-9 rounded-full border-2 border-[var(--ink)] bg-[var(--success)] text-white shadow-md hover:scale-105 active:scale-95 active:shadow-sm active:translate-x-[1px] active:translate-y-[1px] transition-all -rotate-1 flex items-center justify-center"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPause();
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        title={playing ? "Pause" : "Play"}
                        disabled={!isReady}
                    >
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </button>
                </div>
            )}
        </>
    );
}
