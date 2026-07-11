import type { RoomEphemeralState, RoomSessionAdapter, RoomUiState } from "./types";

export const DEFAULT_ROOM_EPHEMERAL_STATE: RoomEphemeralState = {
    mode: "view",
    selectedItemId: null,
    drawerOpen: false,
    draggedItemId: null,
    computerOpen: false,
    shareModalOpen: false,
    musicPlayerItemId: null,
    musicInteractionToken: 0,
};

type RoomStateUpdate = RoomUiState | ((previous: RoomUiState) => RoomUiState);
type RoomStateListener = (state: RoomUiState) => void;

export interface RoomSessionStore {
    getState(): RoomUiState;
    setState(update: RoomStateUpdate): void;
    subscribe(listener: RoomStateListener): () => void;
}

export function createRoomSessionStore(
    adapter: RoomSessionAdapter,
    ephemeralState: Partial<RoomEphemeralState> = {}
): RoomSessionStore {
    let state: RoomUiState = {
        session: { kind: adapter.kind, loaded: true },
        persisted: adapter.load(),
        ephemeral: { ...DEFAULT_ROOM_EPHEMERAL_STATE, ...ephemeralState },
    };
    const listeners = new Set<RoomStateListener>();

    return {
        getState: () => state,
        setState: (update) => {
            const next = typeof update === "function" ? update(state) : update;
            if (next === state) return;
            state = next;
            listeners.forEach((listener) => listener(state));
        },
        subscribe: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
}
