import {
    createElement,
    useMemo,
    type PropsWithChildren,
} from "react";
import { createRoomSessionStore } from "./roomSessionStore";
import type { RoomSessionAdapter } from "./types";
import { RoomSessionContext } from "./roomSessionContext";

interface RoomSessionProviderProps {
    adapter: RoomSessionAdapter;
    storeKey?: string | number;
}

export function RoomSessionProvider({ adapter, storeKey, children }: PropsWithChildren<RoomSessionProviderProps>) {
    const value = useMemo(() => {
        void storeKey;
        return { adapter, store: createRoomSessionStore(adapter) };
    }, [adapter, storeKey]);

    return createElement(RoomSessionContext.Provider, { value }, children);
}
