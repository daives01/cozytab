import { expect, test } from "bun:test";
import { editableUpdate } from "../src/admin/hooks/useEditableField";

test("admin edits preserve numeric, boolean, text and category field contracts", () => {
    expect(editableUpdate("basePrice", "0")).toEqual({ basePrice: 0 });
    expect(editableUpdate("basePrice", "-1")).toEqual({ basePrice: -1 });
    expect(editableUpdate("defaultWidth", "150")).toEqual({ defaultWidth: 150 });
    expect(editableUpdate("isDefault", "false")).toEqual({ isDefault: false });
    expect(editableUpdate("description", "")).toEqual({ description: "" });
    expect(editableUpdate("category", "games")).toEqual({ category: "games" });
    expect(() => editableUpdate("category", "invalid")).toThrow("Invalid category");
});
