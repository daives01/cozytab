import type { ContextMenuState } from "./DesktopContextMenu";

// Selection persists across menus; transient interactions replace one another.
export type DesktopInteraction =
    | { kind: "idle" | "start" | "volume" }
    | { kind: "drag"; id: string }
    | { kind: "rename"; id: string; value: string }
    | { kind: "add"; row: number; col: number; x: number; y: number; value: string }
    | { kind: "context"; menu: NonNullable<ContextMenuState> };

export function editInteraction(state: DesktopInteraction, value: string): DesktopInteraction {
    return state.kind === "rename" || state.kind === "add" ? { ...state, value } : state;
}

export function toggleInteraction(state: DesktopInteraction, kind: "start" | "volume"): DesktopInteraction {
    return { kind: state.kind === kind ? "idle" : kind };
}
