import { useEffect, useState, type PropsWithChildren } from "react";
import type { Id } from "@convex/_generated/dataModel";
import { createRoomEditingSession } from "./roomEditingSession";
import { createRoomSessionLifecycle } from "./roomSessionLifecycle";
import { RoomSessionContext } from "./roomSessionContext";
import type { RoomPersistence } from "./types";

interface RoomSessionProviderProps {
    roomId: string;
    persistence: RoomPersistence;
    ownedCount: (catalogItemId: Id<"catalogItems">) => number;
}

export function RoomSessionProvider({
    roomId,
    persistence,
    ownedCount,
    children,
}: PropsWithChildren<RoomSessionProviderProps>) {
    const [session] = useState(() =>
        createRoomEditingSession({
            roomId,
            persistence,
            ownedCount,
        }),
    );

    const [activateSessionLifecycle] = useState(() => createRoomSessionLifecycle(session));

    useEffect(() => activateSessionLifecycle(), [activateSessionLifecycle]);
    useEffect(() => {
        // The draft is already synchronous; these are best-effort early flushes
        // for backgrounding/shutdown and BFCache, not our recovery guarantee.
        const flush = () => {
            void session.flush();
        };

        const onVisibilityChange = () => {
            if (document.visibilityState === "hidden") flush();
        };

        window.addEventListener("pagehide", flush);
        document.addEventListener("visibilitychange", onVisibilityChange);

        return () => {
            window.removeEventListener("pagehide", flush);
            document.removeEventListener("visibilitychange", onVisibilityChange);
        };
    }, [session]);
    useEffect(() => session.updateOwnedCount(ownedCount), [ownedCount, session]);

    return <RoomSessionContext.Provider value={session}>{children}</RoomSessionContext.Provider>;
}
