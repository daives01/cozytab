import { describe, expect, test } from "bun:test";
import { editInteraction, toggleInteraction, type DesktopInteraction } from "../src/computer/desktopInteraction";

describe("desktop interaction transitions", () => {
    test("opening either taskbar panel discards a rename, add or context interaction", () => {
        const states: DesktopInteraction[] = [
            { kind: "rename", id: "one", value: "draft" },
            { kind: "add", row: 2, col: 1, x: 20, y: 30, value: "example.com" },
            { kind: "context", menu: { target: "shortcut", id: "one", x: 0, y: 0 } },
            { kind: "drag", id: "one" },
        ];
        for (const state of states) {
            for (const panel of ["start", "volume"] as const) {
                const opened = toggleInteraction(state, panel);
                expect(opened).toEqual({ kind: panel });
                expect(editInteraction(opened, "stale input event")).toBe(opened);
                expect(toggleInteraction(opened, panel)).toEqual({ kind: "idle" });
            }
        }
    });

    test("switching panels replaces the previous panel", () => {
        expect(toggleInteraction({ kind: "start" }, "volume")).toEqual({ kind: "volume" });
        expect(toggleInteraction({ kind: "volume" }, "start")).toEqual({ kind: "start" });
    });

    test("editing preserves the rename target and the add cell and anchor", () => {
        const rename: DesktopInteraction = { kind: "rename", id: "one", value: "old" };
        const add: DesktopInteraction = { kind: "add", row: 2, col: 3, x: 10, y: 20, value: "" };
        expect(editInteraction(rename, "new")).toEqual({ ...rename, value: "new" });
        expect(editInteraction(add, "example.com")).toEqual({ ...add, value: "example.com" });
        expect(rename.value).toBe("old");
        expect(add.value).toBe("");
    });
});
