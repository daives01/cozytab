import { createContext } from "react";
import type { RoomEditingSession } from "./types";

export const RoomSessionContext = createContext<RoomEditingSession | null>(null);
