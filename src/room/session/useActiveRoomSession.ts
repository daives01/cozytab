import { useContext, useSyncExternalStore } from "react";
import { RoomSessionContext } from "./roomSessionContext";

export function useActiveRoomSession() {
    const session = useContext(RoomSessionContext);

    if (!session) throw new Error("useActiveRoomSession must be used inside RoomSessionProvider");
    const state = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);

    return { session, state };
}
