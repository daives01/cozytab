import { expect, test } from "bun:test";
import { act, create } from "react-test-renderer";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { Id } from "@convex/_generated/dataModel";
import { useTouchPlacement } from "../src/room/hooks/useTouchPlacement";

test("touch release arms a later tap; other pointers cannot cancel or place; movement cancels", async () => {
    const listeners = new Map<string, EventListener>();

    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const previousAct = Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT");
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
    Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: {
            addEventListener: (type: string, listener: EventListener) => listeners.set(type, listener),
            removeEventListener: (type: string) => listeners.delete(type),
        },
    });
    // SAFETY: Opaque test catalog key; the stub session accepts this same key without database access.
    const id = "item" as Id<"catalogItems">;
    let selected: Id<"catalogItems"> | null = null;
    let placed = 0;
    let accepted = true;
    let hook!: ReturnType<typeof useTouchPlacement>;

    const session = {
        beginPlacement: () => {
            if (accepted) selected = id;

            return accepted
                ? { accepted: true as const }
                : { accepted: false as const, reason: "not-editing" as const };
        },
        cancelPlacement: () => {
            selected = null;
        },
    };

    function Harness() {
        hook = useTouchPlacement(
            {
                handlePlaceCatalogItem: () => {
                    placed++;
                },
            },
            {
                mode: "edit",
                touchPlacementId: selected,
                editingSession: session,
            },
        );

        return null;
    }

    // SAFETY: Hook reads only these pointer fields and propagation methods.
    const pointer = (pointerId: number, type = "pointerdown", clientX = 0) =>
        ({
            pointerType: "touch",
            pointerId,
            type,
            clientX,
            clientY: 0,
            preventDefault() {},
            stopPropagation() {},
        }) as ReactPointerEvent;

    let renderer!: ReturnType<typeof create>;
    const refresh = () => renderer.update(<Harness />);

    const emit = (type: string, pointerId: number, x = 0) => {
        listeners.get(type)?.(
            Object.assign(new Event(type), { pointerType: "touch", pointerId, clientX: x, clientY: 0 }),
        );
    };

    try {
        await act(() => {
            renderer = create(<Harness />);
        });
        await act(() => {
            hook.handleTouchPlaceStart(id, pointer(1));
            refresh();
        });
        await act(() => {
            hook.handleTouchPlaceRoom(pointer(2));
            emit("pointercancel", 2);
        });
        expect(placed).toBe(0);
        expect(selected).toBe(id);
        await act(() => emit("pointerup", 1));
        await act(() => hook.handleTouchPlaceRoom(pointer(3)));
        expect(placed).toBe(1);
        expect(selected).toBeNull();
        await act(() => {
            hook.handleTouchPlaceStart(id, pointer(4));
            refresh();
        });
        await act(() => {
            emit("pointermove", 4, 19);
            refresh();
        });
        expect(selected).toBeNull();

        for (const type of ["pointercancel", "keydown"]) {
            await act(() => {
                hook.handleTouchPlaceStart(id, pointer(6));
                refresh();
            });
            await act(() => {
                if (type === "keydown") listeners.get(type)?.(Object.assign(new Event(type), { key: "Escape" }));
                else emit(type, 6);
                refresh();
            });
            expect(selected).toBeNull();
        }

        accepted = false;
        await act(() => {
            hook.handleTouchPlaceStart(id, pointer(5));
            refresh();
        });
        await act(() => hook.handleTouchPlaceRoom(pointer(5)));
        expect(placed).toBe(1);
    } finally {
        await act(() => renderer.unmount());

        if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
        else Reflect.deleteProperty(globalThis, "window");

        if (previousAct) Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", previousAct);
        else Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
    }
});
