import type { RoomEditingSession } from "./types";

type DeferredTask = (task: () => void) => void;

export function createRoomSessionLifecycle(
    session: RoomEditingSession,
    defer: DeferredTask = queueMicrotask
) {
    let generation = 0;

    return () => {
        generation += 1;
        const mountedGeneration = generation;

        return () => {
            defer(() => {
                if (generation === mountedGeneration) {
                    session.dispose();
                }
            });
        };
    };
}
