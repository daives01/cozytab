import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, EyeOff, GripVertical } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";

interface InlineMusicPlayerProps {
    item: RoomItem;
    scale: number;
    onChange?: (item: RoomItem) => void;
}

export function InlineMusicPlayer({ item, scale, onChange }: InlineMusicPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef({ mouseX: 0, mouseY: 0, itemX: 0, itemY: 0 });
    const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

    if (!item.musicUrl || item.musicType !== "youtube") {
        return null;
    }

    const videoId = extractYouTubeId(item.musicUrl);
    if (!videoId) {
        return null;
    }

    const showVideo = item.videoVisible !== false; // Default to true if not set

    // Use stored position/size, or default to below vinyl player
    const defaultWidth = 320 / scale;
    const defaultHeight = (defaultWidth * 9) / 16; // 16:9 aspect ratio
    const videoX = item.videoX ?? item.x;
    const videoY = item.videoY ?? item.y + 70 / scale;
    const videoWidth = item.videoWidth ?? defaultWidth;
    const videoHeight = item.videoHeight ?? defaultHeight;

    // Build embed URL with enablejsapi for control
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&controls=1&modestbranding=1&rel=0&origin=${window.location.origin}`;

    // Listen for YouTube API state changes
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== "https://www.youtube.com") return;
            
            try {
                const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
                
                if (data.event === "onStateChange") {
                    // 0 = ended, 1 = playing, 2 = paused, 3 = buffering, 5 = cued
                    setIsPlaying(data.info === 1);
                }
            } catch (e) {
                // Ignore parse errors
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, []);

    // Handle dragging
    useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            // Calculate delta in screen coordinates
            const dx = (e.clientX - dragStartRef.current.mouseX) / scale;
            const dy = (e.clientY - dragStartRef.current.mouseY) / scale;

            // Apply delta to the stored position
            const newX = dragStartRef.current.itemX + dx;
            const newY = dragStartRef.current.itemY + dy;

            if (onChange) {
                onChange({
                    ...item,
                    videoX: newX,
                    videoY: newY,
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, item, onChange, scale]);

    // Handle resizing
    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            const dx = (e.clientX - resizeStartRef.current.mouseX) / scale;
            const dy = (e.clientY - resizeStartRef.current.mouseY) / scale;

            const newWidth = Math.max(200 / scale, resizeStartRef.current.width + dx);
            const newHeight = Math.max((200 * 9) / (16 * scale), resizeStartRef.current.height + dy);

            if (onChange) {
                onChange({
                    ...item,
                    videoWidth: newWidth,
                    videoHeight: newHeight,
                });
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);

        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isResizing, item, onChange, scale]);

    // Control YouTube iframe playback via postMessage
    const sendCommand = (command: string) => {
        if (iframeRef.current?.contentWindow) {
            iframeRef.current.contentWindow.postMessage(
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
        } else {
            sendCommand("playVideo");
        }
    };

    const handleToggleVideo = () => {
        const newVisible = !showVideo;
        if (onChange) {
            onChange({
                ...item,
                videoVisible: newVisible,
            });
        }
        
        // Pause when hiding video
        if (!newVisible && isPlaying) {
            sendCommand("pauseVideo");
        }
    };

    const handleDragStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsDragging(true);
        dragStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            itemX: videoX,
            itemY: videoY,
        };
    };

    const handleResizeStart = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setIsResizing(true);
        resizeStartRef.current = {
            mouseX: e.clientX,
            mouseY: e.clientY,
            width: videoWidth,
            height: videoHeight,
        };
    };

    return (
        <>
            {/* Video Player - Always rendered, visually hidden when showVideo is false */}
            <div
                ref={containerRef}
                className="absolute pointer-events-auto"
                style={{
                    left: videoX,
                    top: videoY,
                    transform: "translate(-50%, -50%)",
                    zIndex: item.zIndex + 2,
                    width: `${videoWidth}px`,
                    height: `${videoHeight}px`,
                    opacity: showVideo ? 1 : 0,
                    pointerEvents: showVideo ? "auto" : "none",
                }}
            >
                <div className="relative w-full h-full bg-gradient-to-br from-background to-muted/30 backdrop-blur-md border-4 border-foreground shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] rounded-xl p-3 font-['Patrick_Hand']">
                    {/* Drag Handle */}
                    <div
                        className="absolute -top-3 left-1/2 transform -translate-x-1/2 cursor-move bg-background border-3 border-foreground rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-muted transition-colors z-10 shadow-md"
                        onMouseDown={handleDragStart}
                    >
                        <GripVertical className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">Drag</span>
                    </div>

                    {/* Video - iframe always rendered */}
                    <div
                        className="w-full rounded-lg overflow-hidden border-3 border-foreground/30 bg-black mt-4"
                        style={{
                            aspectRatio: "16/9",
                            height: "calc(100% - 70px)",
                        }}
                    >
                        <iframe
                            ref={iframeRef}
                            src={embedUrl}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            style={{ border: "none" }}
                        />
                    </div>

                    {/* Controls - Two icons centered at bottom */}
                    <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-3">
                        <Button
                            size="icon"
                            variant="default"
                            className="h-10 w-10 shadow-lg hover:scale-105 transition-transform"
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
                            className="h-10 w-10 border-2 shadow-lg bg-background hover:scale-105 transition-transform"
                            onClick={handleToggleVideo}
                            title="Hide video"
                        >
                            <EyeOff className="h-5 w-5" />
                        </Button>
                    </div>

                    {/* Resize Handle - Bottom Right */}
                    <div
                        className="absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize bg-primary border-3 border-foreground rounded-br-lg hover:bg-primary/80 transition-colors"
                        onMouseDown={handleResizeStart}
                        style={{
                            clipPath: "polygon(0 0, 100% 0, 100% 100%)",
                        }}
                    />
                </div>
            </div>
        </>
    );
}
