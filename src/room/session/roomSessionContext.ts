import { createContext } from "react";
import type { RoomSessionStore } from "./roomSessionStore";
import type { RoomSessionAdapter } from "./types";

export interface RoomSessionContextValue {
    adapter: RoomSessionAdapter;
    store: RoomSessionStore;
}

export const RoomSessionContext = createContext<RoomSessionContextValue | null>(null);
