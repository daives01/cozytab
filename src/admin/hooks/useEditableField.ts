import { CATALOG_ITEM_CATEGORIES } from "@shared/categories";
import { useState } from "react";
import type { Id, TableNames } from "@convex/_generated/dataModel";

type EditableField =
    | "name"
    | "category"
    | "assetUrl"
    | "description"
    | "backgroundUrl"
    | "basePrice"
    | "defaultWidth"
    | "isDefault";

export function editableUpdate(field: EditableField, value: string) {
    switch (field) {
        case "basePrice":
            return { basePrice: Number(value) };
        case "defaultWidth":
            return { defaultWidth: Number(value) };
        case "isDefault":
            return { isDefault: value === "true" };
        case "name":
            return { name: value };
        case "category": {
            const category = CATALOG_ITEM_CATEGORIES.find((category) => category === value);

            if (!category) throw new Error("Invalid category");

            return { category };
        }

        case "assetUrl":
            return { assetUrl: value };
        case "description":
            return { description: value };
        case "backgroundUrl":
            return { backgroundUrl: value };
    }
}

interface UseEditableFieldOptions<T extends TableNames> {
    onSave: (id: Id<T>, updates: ReturnType<typeof editableUpdate>) => Promise<{ success: boolean; message?: string }>;
    onError?: (message: string) => void;
}

export function useEditableField<T extends TableNames>({ onSave, onError }: UseEditableFieldOptions<T>) {
    const [editing, setEditing] = useState<{ id: Id<T>; field: EditableField } | undefined>(undefined);
    const [editValue, setEditValue] = useState("");

    const startEdit = (id: Id<T>, field: EditableField, currentValue: string | number | boolean) => {
        setEditing({ id, field });
        setEditValue(String(currentValue ?? ""));
    };

    const saveEdit = async () => {
        if (!editing) return;

        const result = await onSave(editing.id, editableUpdate(editing.field, editValue));

        if (!result.success) {
            const message = result.message ?? "Failed to update";

            if (onError) {
                onError(message);
            }
        }

        setEditing(undefined);
        setEditValue("");
    };

    const cancelEdit = () => {
        setEditing(undefined);
        setEditValue("");
    };

    return {
        editing,
        editValue,
        startEdit,
        saveEdit,
        cancelEdit,
        setEditValue,
    };
}
