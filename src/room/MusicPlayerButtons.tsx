import { useRef, useCallback, useState, useEffect } from "react";
import { Play, Pause } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";

interface MusicPlayerButtonsProps {
    item: RoomItem;
    onToggle?: (playing: boolean) => void;
    autoPlayToken?: string | null;
}

export function MusicPlayerButtons({ item, onToggle, autoPlayToken }: MusicPlayerButtonsProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const playing = item.musicPlaying ?? false;
    const hasPlaybackPermission = hasInteracted || (!!autoPlayToken && playing);
    const needsResume = playing && !hasPlaybackPermission;

    const videoId = item.musicUrl && item.musicType === "youtube" ? extractYouTubeId(item.musicUrl) : null;

    const embedUrl = videoId
        ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&fs=0&iv_load_policy=3&cc_load_policy=0&playsinline=1&loop=1&playlist=${videoId}&origin=${window.location.origin}`
        : null;

    const sendCommand = useCallback(
        (command: string, args?: unknown) => {
            if (!isReady || !iframeRef.current?.contentWindow) return;
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({ event: "command", func: command, args: args ?? "" }),
                "https://www.youtube.com"
            );
        },
        [isReady]
    );

    const handleIframeLoad = useCallback(() => {
        setTimeout(() => setIsReady(true), 500);
    }, []);

    useEffect(() => {
        if (isReady && playing && hasPlaybackPermission) {
            sendCommand("playVideo");
        }
    }, [hasPlaybackPermission, isReady, playing, sendCommand]);

    useEffect(() => {
        if (isReady && !playing) {
            sendCommand("pauseVideo");
        }
    }, [isReady, playing, sendCommand]);

    useEffect(() => {
        if (!autoPlayToken || !playing || !isReady) return;
        sendCommand("playVideo");
    }, [autoPlayToken, isReady, playing, sendCommand]);

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
                        className="pointer-events-auto font-['Patrick_Hand'] text-base px-5 py-3 min-w-[140px] rounded-full border-2 border-[var(--ink)] bg-white shadow-md hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
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
                <div className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 z-20 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <button
                        className="pointer-events-auto font-['Patrick_Hand'] h-12 w-12 md:h-11 md:w-11 rounded-full border-2 border-[var(--ink)] bg-black text-white shadow-md hover:scale-105 active:scale-95 active:shadow-sm active:translate-x-[1px] active:translate-y-[1px] transition-all -rotate-1 flex items-center justify-center"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPause();
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        title={playing ? "Pause" : "Play"}
                        disabled={!isReady}
                    >
                        {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
                    </button>
                </div>
            )}
        </>
    );
}
