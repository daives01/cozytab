import type { RoomEditingSession } from "./types";

type DeferredTask = (task: () => void) => void;

export function createRoomSessionLifecycle(session: RoomEditingSession, defer: DeferredTask = queueMicrotask) {
    let generation = 0;

    return () => {
        generation += 1;
        const mountedGeneration = generation;
        // Recovered drafts retry on mount, outside React render/initialization.
        void session.flush();

        return () => {
            defer(() => {
                if (generation === mountedGeneration) {
                    session.dispose();
                }
            });
        };
    };
}
