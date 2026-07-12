import { useEffect, useState, type PropsWithChildren } from "react";
import type { Id } from "@convex/_generated/dataModel";
import { createRoomEditingSession } from "./roomEditingSession";
import { RoomSessionContext } from "./roomSessionContext";
import type { RoomPersistence } from "./types";

interface RoomSessionProviderProps {
    roomId: string;
    persistence: RoomPersistence;
    ownedCount: (catalogItemId: Id<"catalogItems">) => number;
}

export function RoomSessionProvider({ roomId, persistence, ownedCount, children }: PropsWithChildren<RoomSessionProviderProps>) {
    const [session] = useState(() =>
        createRoomEditingSession({
            roomId,
            persistence,
            ownedCount,
        })
    );

    useEffect(() => () => session.dispose(), [session]);
    useEffect(() => session.updateOwnedCount(ownedCount), [ownedCount, session]);

    return <RoomSessionContext.Provider value={session}>{children}</RoomSessionContext.Provider>;
}
