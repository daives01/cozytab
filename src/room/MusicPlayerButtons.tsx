import { useEffect, useRef, useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Play, Pause, Volume2 } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";

interface MusicPlayerButtonsProps {
    item: RoomItem;
    roomId: Id<"rooms">;
}

export function MusicPlayerButtons({ item, roomId }: MusicPlayerButtonsProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    // Track the last state we processed locally to avoid duplicate syncs
    const lastProcessedRef = useRef<{ playing: boolean; startedAt: number; positionAtStart: number } | null>(null);
    // Track if we initiated the current action (to skip sync effect for our own actions)
    const pendingLocalActionRef = useRef<boolean>(false);
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

    // Sync effect: responds to remote state changes (from other users)
    useEffect(() => {
        if (!videoId || !hasInteracted) return;

        const currentState = { playing: isPlaying, startedAt: musicStartedAt, positionAtStart: musicPositionAtStart };
        const lastProcessed = lastProcessedRef.current;

        // Check if this is a new state we haven't processed yet
        const isNewState = !lastProcessed ||
            lastProcessed.playing !== currentState.playing ||
            lastProcessed.startedAt !== currentState.startedAt ||
            lastProcessed.positionAtStart !== currentState.positionAtStart;

        if (!isNewState) {
            return;
        }

        // If we initiated this action, skip the sync (we already sent commands)
        if (pendingLocalActionRef.current) {
            pendingLocalActionRef.current = false;
            lastProcessedRef.current = currentState;
            return;
        }

        lastProcessedRef.current = currentState;

        // This is a remote state change - sync the player
        if (isPlaying) {
            const elapsed = (Date.now() - musicStartedAt) / 1000;
            const targetPosition = musicPositionAtStart + elapsed;

            // Small delay to ensure iframe is ready to receive commands
            setTimeout(() => {
                sendCommand("seekTo", [targetPosition, true]);
                sendCommand("playVideo");
            }, 100);
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
            // PAUSING
            const elapsed = (now - musicStartedAt) / 1000;
            const currentPosition = musicPositionAtStart + elapsed;

            // Mark that we're initiating this action (skip sync effect)
            pendingLocalActionRef.current = true;
            lastProcessedRef.current = { playing: false, startedAt: now, positionAtStart: currentPosition };

            // Send command IMMEDIATELY for responsive feel
            sendCommand("pauseVideo");

            // Then persist to Convex (this will broadcast to other users)
            await updateMusicState({
                roomId,
                itemId: item.id,
                musicPlaying: false,
                musicStartedAt: now,
                musicPositionAtStart: currentPosition,
            });
        } else {
            // PLAYING/RESUMING
            const currentPosition = musicPositionAtStart;

            // Mark that we're initiating this action (skip sync effect)
            pendingLocalActionRef.current = true;
            lastProcessedRef.current = { playing: true, startedAt: now, positionAtStart: currentPosition };

            // Send commands IMMEDIATELY for responsive feel
            sendCommand("seekTo", [currentPosition, true]);
            sendCommand("playVideo");

            // Then persist to Convex (this will broadcast to other users)
            await updateMusicState({
                roomId,
                itemId: item.id,
                musicPlaying: true,
                musicStartedAt: now,
                musicPositionAtStart: currentPosition,
            });
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
                    zIndex: 11,
                }}
            >
                <div className="flex items-center justify-center gap-2">
                    {needsSync && isPlaying ? (
                        <button
                            className="font-['Patrick_Hand'] px-3 py-1.5 rounded-full border-4 border-emerald-600 bg-emerald-400 text-emerald-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:scale-105 active:scale-95 transition-transform animate-pulse rotate-1 flex items-center gap-1.5 font-bold text-sm"
                            onClick={handleEnableAudio}
                            title="Click to resume audio"
                        >
                            <Volume2 className="h-4 w-4" />
                            Resume
                        </button>
                    ) : (
                        <button
                            className="font-['Patrick_Hand'] h-10 w-10 rounded-full border-4 border-emerald-600 bg-emerald-400 text-emerald-900 shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] hover:scale-105 active:scale-95 transition-transform -rotate-1 flex items-center justify-center"
                            onClick={handlePlayPause}
                            title={isPlaying ? "Pause" : "Play"}
                        >
                            {isPlaying ? (
                                <Pause className="h-5 w-5" />
                            ) : (
                                <Play className="h-5 w-5 ml-0.5" />
                            )}
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
