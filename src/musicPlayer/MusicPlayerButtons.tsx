import { useRef, useCallback, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";
import { ensureAudioReady } from "@/lib/audio";
import { useKeyboardSoundPreferences } from "../hooks/useKeyboardSoundSetting";

const VISITOR_UNMUTE_AHEAD_SECONDS = 0.1;

export interface MusicPlayerButtonsProps {
    item: RoomItem;
    onToggle?: (playing: boolean) => void;
    isVisitor?: boolean;
    interactionGranted?: boolean;
}

export function MusicPlayerButtons({
    item,
    onToggle,
    isVisitor = false,
    interactionGranted = false,
}: MusicPlayerButtonsProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [localInteracted, setLocalInteracted] = useState(false);
    const [muted, setMuted] = useState(false);
    const { musicVolume } = useKeyboardSoundPreferences();
    const playing = item.musicPlaying ?? false;
    const lastSeekRef = useRef<number>(0);

    const hasInteracted = localInteracted || interactionGranted;

    const videoId = item.musicUrl && item.musicType === "youtube" ? extractYouTubeId(item.musicUrl) : null;

    const embedUrl = videoId
        ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&fs=0&iv_load_policy=3&cc_load_policy=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`
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

    const computeLivePositionSeconds = useCallback(() => {
        const positionAtStart = item.musicPositionAtStart ?? 0;
        const startedAt = item.musicStartedAt ?? 0;
        if (item.musicPlaying && startedAt) {
            return (positionAtStart + Math.max(0, Date.now() - startedAt)) / 1000;
        }
        return positionAtStart / 1000;
    }, [item.musicPlaying, item.musicPositionAtStart, item.musicStartedAt]);

    const seekTo = useCallback(
        (seconds: number, force = false) => {
            if (!isReady || !videoId) return;
            if (!force && Math.abs(seconds - lastSeekRef.current) < 0.5) return;
            sendCommand("seekTo", [seconds, true]);
            lastSeekRef.current = seconds;
        },
        [isReady, sendCommand, videoId]
    );

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== "https://www.youtube.com") return;
            try {
                const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
                if (data.event === "onReady" || data.info?.playerState !== undefined) {
                    setIsReady(true);
                }
            } catch {
                // Ignore non-JSON messages
            }
        };
        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    const handleIframeLoad = useCallback(() => {
        setTimeout(() => setIsReady(true), 400);
    }, []);

    useEffect(() => {
        lastSeekRef.current = 0;
    }, [videoId]);

    useEffect(() => {
        if (!isReady || !videoId) return;
        seekTo(computeLivePositionSeconds(), true);
    }, [isReady, videoId, item.musicStartedAt, item.musicPositionAtStart, seekTo, computeLivePositionSeconds]);

    const shouldPlay = isReady && playing && hasInteracted && (!isVisitor || !muted);

    useEffect(() => {
        if (!isReady || !videoId) return;
        sendCommand(shouldPlay ? "playVideo" : "pauseVideo");
    }, [isReady, videoId, shouldPlay, sendCommand]);

    useEffect(() => {
        if (!isReady) return;
        sendCommand("setVolume", [Math.round(musicVolume * 100)]);
    }, [isReady, musicVolume, sendCommand]);

    useEffect(() => {
        if (!isReady) return;
        sendCommand(muted ? "mute" : "unMute");
    }, [isReady, muted, sendCommand]);

    const handlePlayPause = () => {
        void ensureAudioReady();

        if (isVisitor) {
            if (!isReady) return;
            setLocalInteracted(true);
            setMuted((prev) => {
                const next = !prev;
                if (!next) {
                    seekTo(computeLivePositionSeconds() + VISITOR_UNMUTE_AHEAD_SECONDS, true);
                }
                return next;
            });
            return;
        }

        setLocalInteracted(true);
        onToggle?.(!playing);
    };

    const handleResume = () => {
        void ensureAudioReady();
        setLocalInteracted(true);
        setMuted(false);
    };

    if (!item.musicUrl || item.musicType !== "youtube" || !videoId || !embedUrl) {
        return null;
    }

    const needsResume = playing && !hasInteracted;

    return (
        <>
            <iframe
                ref={iframeRef}
                src={embedUrl}
                style={{
                    width: 1,
                    height: 1,
                    opacity: 0,
                    position: "absolute",
                    left: 0,
                    top: 0,
                    pointerEvents: "none",
                }}
                allow="autoplay; encrypted-media; picture-in-picture"
                onLoad={handleIframeLoad}
            />

            {needsResume ? (
                <div className="absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 z-20 opacity-95 whitespace-nowrap">
                    <button
                        className="pointer-events-auto font-['Patrick_Hand'] text-size-xl px-5 py-3 min-w-[140px] rounded-full border-2 border-[var(--ink)] bg-white shadow-md hover:scale-105 active:scale-95 transition-all whitespace-nowrap"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleResume();
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                    >
                        Listen in
                    </button>
                </div>
            ) : (
                <div className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] -translate-x-1/2 z-20 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                    <button
                        className="pointer-events-auto font-['Patrick_Hand'] h-[64px] w-[64px] md:h-[60px] md:w-[60px] rounded-full border-2 border-[var(--ink)] bg-black text-white shadow-md hover:scale-105 active:scale-95 active:shadow-sm active:translate-x-[1px] active:translate-y-[1px] transition-all -rotate-1 flex items-center justify-center"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.stopPropagation();
                            handlePlayPause();
                        }}
                        onTouchStart={(e) => e.stopPropagation()}
                        title={isVisitor ? (muted ? "Unmute" : "Mute") : playing ? "Pause" : "Play"}
                    >
                        {isVisitor ? (
                            muted ? (
                                <VolumeX className="h-7 w-7" />
                            ) : (
                                <Volume2 className="h-7 w-7 ml-0.5" />
                            )
                        ) : playing ? (
                            <Pause className="h-7 w-7" />
                        ) : (
                            <Play className="h-7 w-7 ml-0.5" />
                        )}
                    </button>
                </div>
            )}
        </>
    );
}
