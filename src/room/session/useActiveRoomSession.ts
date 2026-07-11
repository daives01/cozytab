import { useContext, useSyncExternalStore } from "react";
import { RoomSessionContext } from "./roomSessionContext";
import type { RoomSessionStore } from "./roomSessionStore";
import type { RoomSessionAdapter, RoomUiState } from "./types";

export function useActiveRoomSession(): {
    adapter: RoomSessionAdapter;
    state: RoomUiState;
    setState: RoomSessionStore["setState"];
} {
    const context = useContext(RoomSessionContext);
    if (!context) throw new Error("useActiveRoomSession must be used inside RoomSessionProvider");
    const state = useSyncExternalStore(context.store.subscribe, context.store.getState, context.store.getState);
    return { adapter: context.adapter, state, setState: context.store.setState };
}
