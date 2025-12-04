import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCallback, useEffect, useRef, useState } from "react";

const SAMPLING_INTERVAL = 50;
const BATCH_INTERVAL = 1000;
const HEARTBEAT_INTERVAL = 2000;

type CursorAction = {
    x: number;
    y: number;
    timeSinceBatchStart: number;
    text?: string;
};

export function usePresence(
    roomId: Id<"rooms"> | null,
    visitorId: string,
    displayName: string,
    isOwner: boolean
) {
    const updatePresenceMutation = useMutation(api.presence.updatePresence);
    const leaveRoomMutation = useMutation(api.presence.leaveRoom);
    const visitors = useQuery(
        api.presence.getRoomPresence,
        roomId ? { roomId } : "skip"
    );

    const actionBatchRef = useRef<CursorAction[]>([]);
    const batchStartTimeRef = useRef<number>(0);
    const lastSampleTimeRef = useRef<number>(0);
    const localCursorRef = useRef({ x: 960, y: 540 });
    const [screenCursor, setScreenCursor] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    const [localChatMessage, setLocalChatMessage] = useState<string | null>(null);
    const currentTextRef = useRef<string | null>(null);

    const sendBatch = useCallback(() => {
        if (!roomId) return;

        const currentBatch = actionBatchRef.current;
        batchStartTimeRef.current = Date.now();

        if (currentBatch.length === 0) return;

        updatePresenceMutation({
            roomId,
            visitorId,
            displayName,
            isOwner,
            actions: currentBatch,
        });

        actionBatchRef.current = [];
    }, [roomId, visitorId, displayName, isOwner, updatePresenceMutation]);

    const updateCursor = useCallback(
        (roomX: number, roomY: number, screenX: number, screenY: number) => {
            setScreenCursor({ x: screenX, y: screenY });
            
            if (!roomId) return;

            localCursorRef.current = { x: roomX, y: roomY };

            const now = Date.now();
            if (now - lastSampleTimeRef.current < SAMPLING_INTERVAL) return;
            lastSampleTimeRef.current = now;

            const action: CursorAction = {
                x: roomX,
                y: roomY,
                timeSinceBatchStart: now - batchStartTimeRef.current,
            };
            
            if (currentTextRef.current) {
                action.text = currentTextRef.current;
            }

            actionBatchRef.current.push(action);
        },
        [roomId]
    );

    const updateChatMessage = useCallback(
        (message: string | null) => {
            currentTextRef.current = message;
            setLocalChatMessage(message);
            
            if (roomId) {
                const now = Date.now();
                const action: CursorAction = {
                    x: localCursorRef.current.x,
                    y: localCursorRef.current.y,
                    timeSinceBatchStart: now - batchStartTimeRef.current,
                };
                if (message) {
                    action.text = message;
                }
                actionBatchRef.current.push(action);
            }
        },
        [roomId]
    );

    useEffect(() => {
        if (!roomId) return;

        batchStartTimeRef.current = Date.now();
        actionBatchRef.current = [{ x: 960, y: 540, timeSinceBatchStart: 0 }];
        sendBatch();

        const batchInterval = setInterval(sendBatch, BATCH_INTERVAL);

        const heartbeatInterval = setInterval(() => {
            const now = Date.now();
            const action: CursorAction = {
                x: localCursorRef.current.x,
                y: localCursorRef.current.y,
                timeSinceBatchStart: now - batchStartTimeRef.current,
            };
            if (currentTextRef.current) {
                action.text = currentTextRef.current;
            }
            actionBatchRef.current.push(action);
        }, HEARTBEAT_INTERVAL);

        return () => {
            clearInterval(batchInterval);
            clearInterval(heartbeatInterval);
        };
    }, [roomId, sendBatch]);

    useEffect(() => {
        return () => {
            if (roomId) {
                leaveRoomMutation({ roomId, visitorId });
            }
        };
    }, [roomId, visitorId, leaveRoomMutation]);

    return {
        visitors: visitors ?? [],
        updateCursor,
        updateChatMessage,
        screenCursor,
        localChatMessage,
        batchInterval: BATCH_INTERVAL,
    };
}
