import { useEffect, useRef, useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2 } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";

interface MusicPlayerButtonsProps {
    item: RoomItem;
    roomId: Id<"rooms">;
}

export function MusicPlayerButtons({ item, roomId }: MusicPlayerButtonsProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const lastSyncedRef = useRef<{ playing: boolean; startedAt: number; positionAtStart: number } | null>(null);
    const updateMusicState = useMutation(api.rooms.updateMusicState);
    const [hasInteracted, setHasInteracted] = useState(false);

    const videoId = item.musicUrl && item.musicType === "youtube" ? extractYouTubeId(item.musicUrl) : null;
    const isPlaying = item.musicPlaying ?? false;
    const musicStartedAt = item.musicStartedAt ?? 0;
    const musicPositionAtStart = item.musicPositionAtStart ?? 0;
    const needsSync = isPlaying && !hasInteracted;

    const embedUrl = videoId
        ? `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=0&controls=0&rel=0&fs=0&iv_load_policy=3&cc_load_policy=0&playsinline=1&loop=1&playlist=${videoId}&origin=${window.location.origin}`
        : null;

    const sendCommand = useCallback((command: string, args?: unknown) => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
                JSON.stringify({
                    event: "command",
                    func: command,
                    args: args ?? "",
                }),
                "https://www.youtube.com"
            );
        }
    }, []);

    const syncPlayback = useCallback(() => {
        if (!videoId || !isPlaying) return;
        
        const elapsed = (Date.now() - musicStartedAt) / 1000;
        const targetPosition = musicPositionAtStart + elapsed;
        
        sendCommand("seekTo", [targetPosition, true]);
        sendCommand("playVideo");
    }, [videoId, isPlaying, musicStartedAt, musicPositionAtStart, sendCommand]);

    const handleEnableAudio = () => {
        setHasInteracted(true);
        syncPlayback();
    };

    useEffect(() => {
        if (!videoId) return;

        const lastSynced = lastSyncedRef.current;
        const currentState = { playing: isPlaying, startedAt: musicStartedAt, positionAtStart: musicPositionAtStart };

        if (
            lastSynced &&
            lastSynced.playing === currentState.playing &&
            lastSynced.startedAt === currentState.startedAt &&
            lastSynced.positionAtStart === currentState.positionAtStart
        ) {
            return;
        }

        lastSyncedRef.current = currentState;

        if (!hasInteracted) {
            return;
        }

        if (isPlaying) {
            const elapsed = (Date.now() - musicStartedAt) / 1000;
            const targetPosition = musicPositionAtStart + elapsed;

            setTimeout(() => {
                sendCommand("seekTo", [targetPosition, true]);
                sendCommand("playVideo");
            }, 300);
        } else {
            sendCommand("pauseVideo");
            if (musicPositionAtStart > 0) {
                sendCommand("seekTo", [musicPositionAtStart, true]);
            }
        }
    }, [videoId, isPlaying, musicStartedAt, musicPositionAtStart, sendCommand, hasInteracted]);

    const handlePlayPause = async () => {
        if (!videoId) return;

        setHasInteracted(true);

        const now = Date.now();

        if (isPlaying) {
            const elapsed = (now - musicStartedAt) / 1000;
            const currentPosition = musicPositionAtStart + elapsed;

            lastSyncedRef.current = { playing: false, startedAt: now, positionAtStart: currentPosition };
            
            await updateMusicState({
                roomId,
                itemId: item.id,
                musicPlaying: false,
                musicStartedAt: now,
                musicPositionAtStart: currentPosition,
            });

            sendCommand("pauseVideo");
        } else {
            const currentPosition = musicPositionAtStart;

            lastSyncedRef.current = { playing: true, startedAt: now, positionAtStart: currentPosition };
            
            await updateMusicState({
                roomId,
                itemId: item.id,
                musicPlaying: true,
                musicStartedAt: now,
                musicPositionAtStart: currentPosition,
            });

            sendCommand("seekTo", [currentPosition, true]);
            sendCommand("playVideo");
        }
    };

    if (!item.musicUrl || item.musicType !== "youtube" || !videoId || !embedUrl) {
        return null;
    }

    const offsetY = 70;

    return (
        <>
            <iframe
                ref={iframeRef}
                src={embedUrl}
                className="absolute pointer-events-none"
                style={{
                    width: 1,
                    height: 1,
                    opacity: 0,
                    position: "absolute",
                    left: -9999,
                    top: -9999,
                }}
                allow="autoplay"
            />

            <div
                className="absolute pointer-events-auto"
                style={{
                    left: item.x,
                    top: item.y + offsetY,
                    transform: "translate(-50%, 0)",
                    zIndex: item.zIndex + 1,
                }}
            >
                <div className="flex items-center justify-center gap-2">
                    {needsSync && isPlaying ? (
                        <Button
                            size="sm"
                            variant="default"
                            className="rounded-full shadow-lg hover:scale-105 transition-transform bg-emerald-500 hover:bg-emerald-600 animate-pulse"
                            onClick={handleEnableAudio}
                            title="Click to resume audio"
                        >
                            <Volume2 className="h-4 w-4 mr-1" />
                            Resume
                        </Button>
                    ) : (
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
                    )}
                </div>
            </div>
        </>
    );
}
