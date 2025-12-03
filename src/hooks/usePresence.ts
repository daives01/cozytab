import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { useCallback, useEffect, useRef } from "react";

const SAMPLING_INTERVAL = 50;
const BATCH_INTERVAL = 500;

type CursorAction = {
    x: number;
    y: number;
    timeSinceBatchStart: number;
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
    const batchIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
        }).catch(console.error);

        actionBatchRef.current = [];
    }, [roomId, visitorId, displayName, isOwner, updatePresenceMutation]);

    const updateCursor = useCallback(
        (x: number, y: number) => {
            if (!roomId) return;

            const now = Date.now();

            if (now - lastSampleTimeRef.current < SAMPLING_INTERVAL) return;

            lastSampleTimeRef.current = now;

            actionBatchRef.current.push({
                x,
                y,
                timeSinceBatchStart: now - batchStartTimeRef.current,
            });
        },
        [roomId]
    );

    useEffect(() => {
        if (!roomId) return;

        batchStartTimeRef.current = Date.now();
        actionBatchRef.current = [{ x: 960, y: 540, timeSinceBatchStart: 0 }];
        sendBatch();

        batchIntervalRef.current = setInterval(sendBatch, BATCH_INTERVAL);

        return () => {
            if (batchIntervalRef.current) {
                clearInterval(batchIntervalRef.current);
            }
        };
    }, [roomId, sendBatch]);

    useEffect(() => {
        return () => {
            if (roomId) {
                leaveRoomMutation({ roomId, visitorId }).catch(console.error);
            }
        };
    }, [roomId, visitorId, leaveRoomMutation]);

    return {
        visitors: visitors ?? [],
        updateCursor,
        batchInterval: BATCH_INTERVAL,
    };
}
