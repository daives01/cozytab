import { useRef, useCallback, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";
import { ensureAudioReady } from "@/lib/audio";
import { useKeyboardSoundPreferences } from "../hooks/useKeyboardSoundSetting";

// When a visitor unmutes, jump slightly ahead to counteract accumulated lag.
const VISITOR_UNMUTE_AHEAD_SECONDS = .1;
const PLAY_KICK_DELAY_MS = 1000;

export interface MusicPlayerButtonsProps {
    item: RoomItem;
    onToggle?: (playing: boolean) => void;
    autoPlayToken?: string | null;
    isVisitor?: boolean;
}

export function MusicPlayerButtons({ item, onToggle, autoPlayToken, isVisitor = false }: MusicPlayerButtonsProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isReady, setIsReady] = useState(false);
    // Everyone must interact first due to browser autoplay restrictions.
    const [hasInteracted, setHasInteracted] = useState(false);
    const [muted, setMuted] = useState(false);
    const { musicVolume } = useKeyboardSoundPreferences();
    const playing = item.musicPlaying ?? false;
    // Host: require explicit interaction to auto-play after refresh; ignore token.
    // Visitor: require first interaction; token only helps after interaction is granted.
    const needsResume = playing && !hasInteracted;
    const lastSeekSecondsRef = useRef<number>(0);

    const videoId = item.musicUrl && item.musicType === "youtube" ? extractYouTubeId(item.musicUrl) : null;

    const origin = typeof window !== "undefined" ? encodeURIComponent(window.location.origin) : "";
    const embedUrl = videoId
        ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&fs=0&iv_load_policy=3&cc_load_policy=0&playsinline=1${origin ? `&origin=${origin}` : ""}`
        : null;

    const computeLivePositionSeconds = useCallback(() => {
        const positionAtStart = item.musicPositionAtStart ?? 0;
        const startedAt = item.musicStartedAt ?? 0;
        const nowSeconds =
            item.musicPlaying && startedAt
                ? (positionAtStart + Math.max(0, Date.now() - startedAt)) / 1000
                : positionAtStart / 1000;
        return nowSeconds;
    }, [item.musicPlaying, item.musicPositionAtStart, item.musicStartedAt]);

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

    const seekTo = useCallback(
        (seconds: number, force = false) => {
            if (!isReady || !videoId) return;
            const delta = Math.abs(seconds - lastSeekSecondsRef.current);
            if (!force && delta < 0.25) return;
            sendCommand("seekTo", [seconds, true]);
            lastSeekSecondsRef.current = seconds;
        },
        [isReady, sendCommand, videoId]
    );

    useEffect(() => {
        lastSeekSecondsRef.current = 0;
        if (isReady) {
            sendCommand("pauseVideo");
        }
    }, [isReady, sendCommand, videoId]);

    useEffect(() => {
        if (!isReady || !videoId) return;
        const nowSeconds = computeLivePositionSeconds();
        seekTo(nowSeconds);
    }, [computeLivePositionSeconds, isReady, seekTo, videoId]);

    // When a new track is requested, wait a beat before attempting play so the iframe is settled.
    useEffect(() => {
        if (!playing || !isReady || !videoId) return;
        if (isVisitor && muted) return;
        if (!hasInteracted) return;
        const timer = window.setTimeout(() => {
            sendCommand("playVideo");
        }, PLAY_KICK_DELAY_MS);
        return () => window.clearTimeout(timer);
    }, [hasInteracted, isReady, isVisitor, muted, playing, sendCommand, videoId]);

    useEffect(() => {
        const canPlay = hasInteracted && playing && (!isVisitor || !muted);
        if (isReady && canPlay) {
            sendCommand("playVideo");
        }
    }, [hasInteracted, isVisitor, isReady, muted, playing, sendCommand]);

    useEffect(() => {
        if (!isReady) return;
        sendCommand("setVolume", [Math.round(musicVolume * 100)]);
    }, [isReady, musicVolume, sendCommand]);

    useEffect(() => {
        if (isReady && !playing) {
            sendCommand("pauseVideo");
        }
    }, [isReady, playing, sendCommand]);

    useEffect(() => {
        if (!isReady) return;
        sendCommand(muted ? "mute" : "unMute");
    }, [isReady, muted, sendCommand]);

    // Token-based autoplay only applies for visitors after interaction (host ignores it) and only when unmuted.
    useEffect(() => {
        if (!isVisitor) return;
        if (!hasInteracted) return;
        if (!autoPlayToken || !playing || !isReady) return;
        if (muted) return;
        sendCommand("playVideo");
    }, [autoPlayToken, hasInteracted, isReady, isVisitor, muted, playing, sendCommand]);

    const handlePlayPause = () => {
        void ensureAudioReady();

        // Visitors only toggle local mute; host controls playback.
        if (isVisitor) {
            if (!isReady) return;
            setHasInteracted(true);
            setMuted((prev) => {
                const next = !prev;
                if (next) {
                    sendCommand("mute");
                } else {
                    seekTo(computeLivePositionSeconds() + VISITOR_UNMUTE_AHEAD_SECONDS, true);
                    sendCommand("unMute");
                }
                return next;
            });
            return;
        }

        // Host controls global playback state
        if (playing) {
            if (isReady) sendCommand("pauseVideo");
            onToggle?.(false);
        } else {
            setHasInteracted(true);
            if (isReady) sendCommand("playVideo");
            onToggle?.(true);
        }
    };

    const handleResume = () => {
        void ensureAudioReady();
        setHasInteracted(true);
        setMuted(false);
        if (isReady) {
            sendCommand("playVideo");
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
                style={{ width: 1, height: 1, opacity: 0, position: "absolute", left: 0, top: 0, pointerEvents: "none" }}
                allow="autoplay; encrypted-media"
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
                        {isVisitor
                            ? muted
                                ? <VolumeX className="h-7 w-7" />
                                : <Volume2 className="h-7 w-7 ml-0.5" />
                            : playing
                                ? <Pause className="h-7 w-7" />
                                : <Play className="h-7 w-7 ml-0.5" />}
                    </button>
                </div>
            )}
        </>
    );
}
