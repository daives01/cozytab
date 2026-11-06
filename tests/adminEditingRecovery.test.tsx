import { expect, test } from "bun:test";
import { act, create } from "react-test-renderer";
import { convexTest } from "convex-test";
import schema from "@convex/schema";
import { useEditableField } from "@/admin/hooks/useEditableField";
import { EditableCell } from "@/admin/EditableCell";

test("invalid category edits report an error without saving and allow correction", async () => {
    const t = convexTest(schema, {
        "@convex/_generated/api.js": () => import("@convex/_generated/api.js"),
        "@convex/_generated/server.js": () => import("@convex/_generated/server.js"),
    });

    const id = await t.run((ctx) =>
        ctx.db.insert("catalogItems", {
            name: "Game",
            category: "games",
            basePrice: 0,
            assetUrl: "game.svg",
            defaultWidth: 100,
        }),
    );

    const errors: string[] = [];
    const saved: unknown[] = [];

    function Harness() {
        const edit = useEditableField<"catalogItems">({
            onSave: async (_id, patch) => {
                saved.push(patch);

                return { success: true };
            },
            onError: (error) => errors.push(error),
        });

        return (
            <EditableCell
                value="games"
                isEditing={!!edit.editing}
                editValue={edit.editValue}
                onEdit={() => edit.startEdit(id, "category", "games")}
                onChange={edit.setEditValue}
                onSave={edit.saveEdit}
                onCancel={edit.cancelEdit}
            />
        );
    }

    const original = Object.getOwnPropertyDescriptor(globalThis, "IS_REACT_ACT_ENVIRONMENT");
    Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", { configurable: true, value: true });
    const renderer = await act(() => create(<Harness />));

    try {
        await act(() => renderer.root.findByType("span").props.onClick());
        await act(() => renderer.root.findByType("input").props.onChange({ target: { value: "invalid" } }));
        await act(async () => renderer.root.findByType("input").props.onBlur());
        expect(saved).toEqual([]);
        expect(errors).toEqual(["Invalid category"]);
        expect(renderer.root.findByType("input").props.value).toBe("invalid");
        await act(() => renderer.root.findByType("input").props.onChange({ target: { value: "decor" } }));
        await act(async () => renderer.root.findByType("input").props.onBlur());
        expect(saved).toEqual([{ category: "decor" }]);
        expect(renderer.root.findAllByType("input")).toHaveLength(0);
    } finally {
        await act(() => renderer.unmount());

        if (original) Object.defineProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT", original);
        else Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
    }
});
