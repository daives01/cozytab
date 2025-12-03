import { useState, useRef, useEffect } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, EyeOff, GripVertical, RotateCw } from "lucide-react";
import type { RoomItem } from "../types";
import { extractYouTubeId } from "../lib/youtube";

interface InlineMusicPlayerProps {
    item: RoomItem;
    scale: number;
    isPlaying: boolean;
    onPlayingChange: (playing: boolean) => void;
    onChange?: (item: RoomItem) => void;
}

export function InlineMusicPlayer({ item, scale, isPlaying, onPlayingChange, onChange }: InlineMusicPlayerProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const dragStartRef = useRef({ mouseX: 0, mouseY: 0, itemX: 0, itemY: 0 });
    const resizeStartRef = useRef({ mouseX: 0, mouseY: 0, width: 0, height: 0 });

    const videoId = item.musicUrl && item.musicType === "youtube" ? extractYouTubeId(item.musicUrl) : null;
    const showVideo = item.videoVisible !== false;
    const tvRotationAngle = item.tvRotationAngle ?? 20;

    useEffect(() => {
        if (!videoId) return;
        const handleMessage = (event: MessageEvent) => {
            if (event.origin !== "https://www.youtube.com") return;
            
            if (iframeRef.current && event.source !== iframeRef.current.contentWindow) {
                return;
            }
            
            try {
                const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
                
                if (data.event === "onStateChange") {
                    const playing = data.info === 1;
                    onPlayingChange(playing);
                }
            } catch {
                // no-op
            }
        };

        window.addEventListener("message", handleMessage);
        return () => window.removeEventListener("message", handleMessage);
    }, [onPlayingChange, videoId]);

    const defaultWidth = 320;
    const defaultHeight = (defaultWidth * 9) / 16; // 16:9 aspect ratio
    const videoX = item.videoX ?? item.x;
    const videoY = item.videoY ?? item.y + 70;
    const videoWidth = item.videoWidth ?? defaultWidth;
    const videoHeight = item.videoHeight ?? defaultHeight;

    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&controls=0&rel=0&fs=0&iv_load_policy=3&cc_load_policy=0&playsinline=1&loop=1&playlist=${videoId}&origin=${window.location.origin}`;

    useEffect(() => {
        if (!isDragging || !videoId) return;

        const handleMouseMove = (e: MouseEvent) => {
            const dx = (e.clientX - dragStartRef.current.mouseX) / scale;
            const dy = (e.clientY - dragStartRef.current.mouseY) / scale;

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
    }, [isDragging, item, onChange, scale, videoId]);

    useEffect(() => {
        if (!isResizing || !videoId) return;

        const handleMouseMove = (e: MouseEvent) => {
            const dx = (e.clientX - resizeStartRef.current.mouseX) / scale;
            const dy = (e.clientY - resizeStartRef.current.mouseY) / scale;

            const newWidth = Math.max(200, resizeStartRef.current.width + dx);
            const newHeight = Math.max((200 * 9) / 16, resizeStartRef.current.height + dy);

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
    }, [isResizing, item, onChange, scale, videoId]);

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

    useEffect(() => {
        if (!videoId || !isPlaying || !iframeRef.current?.contentWindow) return;
            const timer = setTimeout(() => {
                sendCommand("playVideo");
            }, 500);
            return () => clearTimeout(timer);
    }, [videoId, isPlaying]);

    if (!item.musicUrl || item.musicType !== "youtube" || !videoId) {
        return null;
    }

    const handlePlayPause = () => {
        if (isPlaying) {
            sendCommand("pauseVideo");
            onPlayingChange(false);
        } else {
            sendCommand("playVideo");
            onPlayingChange(true);
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
    };

    const handleRotate = () => {
        const newAngle = tvRotationAngle === 45 ? -45 : 45;
        if (onChange) {
            onChange({
                ...item,
                tvRotationAngle: newAngle,
            });
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

    const hoverPadding = 60;

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
                    opacity: showVideo ? 1 : 0,
                    pointerEvents: showVideo ? "auto" : "none",
                    paddingTop: `${hoverPadding}px`,
                    paddingBottom: `${hoverPadding}px`,
                }}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Drag Handle - Above frame, only on hover */}
                <div
                    className={`absolute left-1/2 transform -translate-x-1/2 cursor-move bg-background border-3 border-foreground rounded-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-muted transition-all z-10 shadow-md font-['Patrick_Hand'] ${
                        isHovered ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 -translate-y-2 pointer-events-none"
                    }`}
                    style={{
                        bottom: `calc(100% - ${hoverPadding}px)`,
                        marginBottom: `8px`,
                    }}
                    onMouseDown={handleDragStart}
                >
                    <GripVertical className="h-3.5 w-3.5" />
                </div>

                {/* Isometric TV Container */}
                <div
                    className="relative"
                    style={{
                        perspective: "1000px",
                        perspectiveOrigin: "center center",
                    }}
                >
                    {/* TV Frame with Isometric Transform */}
                    <div
                        className="relative font-['Patrick_Hand'] transition-transform duration-300"
                        style={{
                            width: `${videoWidth}px`,
                            height: `${videoHeight}px`,
                            transform: `rotateX(-28deg) rotateY(${tvRotationAngle}deg) scaleY(0.866)`,
                            transformStyle: "preserve-3d",
                            transformOrigin: "center center",
                        }}
                    >
                        {/* TV Bezel (outer frame) */}
                        <div
                            className="absolute inset-0 bg-gradient-to-br from-gray-800 to-gray-900 border-4 border-gray-700 rounded-lg shadow-[8px_8px_0px_0px_rgba(31,41,55,1)]"
                            style={{
                                padding: "12px",
                            }}
                        >
                            {/* TV Screen (inner frame) */}
                            <div
                                className="relative w-full h-full bg-black rounded-sm overflow-hidden border-2 border-gray-600"
                            >
                                {/* Video - iframe always rendered */}
                                <iframe
                                    ref={iframeRef}
                                    src={embedUrl}
                                    className="w-full h-full"
                                    style={{ border: "none" }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Resize Handle - Bottom Right (outside transform) */}
                    <div
                        className={`absolute bottom-0 right-0 w-5 h-5 cursor-nwse-resize bg-primary border-3 border-foreground rounded-br-lg hover:bg-primary/80 transition-all ${
                            isHovered ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                        }`}
                        onMouseDown={handleResizeStart}
                        style={{
                            clipPath: "polygon(100% 100%, 0 100%, 100% 0)",
                            transform: "translate(50%, 50%)", // Position at corner
                        }}
                    />
                </div>

                {/* Controls - Below frame, only on hover */}
                <div
                    className={`absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center gap-3 transition-all ${
                        isHovered ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-2 pointer-events-none"
                    }`}
                    style={{
                        top: `calc(100% - ${hoverPadding}px)`,
                        marginTop: `8px`,
                    }}
                >
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
                        onClick={handleToggleVideo}
                        title="Hide video"
                    >
                        <EyeOff className="h-5 w-5" />
                    </Button>
                    <Button
                        size="icon"
                        variant="outline"
                        className="h-10 w-10 rounded-full border-2 shadow-lg bg-background hover:scale-105 transition-transform"
                        onClick={handleRotate}
                        title="Rotate TV"
                    >
                        <RotateCw className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </>
    );
}
