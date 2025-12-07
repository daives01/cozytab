import { useState } from "react";
import type { Id, TableNames } from "../../../convex/_generated/dataModel";

interface UseEditableFieldOptions<T extends TableNames> {
    onSave: (id: Id<T>, field: string, value: string | number | boolean) => Promise<{ success: boolean; message?: string }>;
    onError?: (message: string) => void;
}

export function useEditableField<T extends TableNames>({ onSave, onError }: UseEditableFieldOptions<T>) {
    const [editing, setEditing] = useState<{ id: Id<T>; field: string } | undefined>(undefined);
    const [editValue, setEditValue] = useState("");

    const startEdit = (id: Id<T>, field: string, currentValue: string | number | boolean) => {
        setEditing({ id, field });
        setEditValue(String(currentValue ?? ""));
    };

    const saveEdit = async () => {
        if (!editing) return;

        let value: string | number | boolean = editValue;
        if (editing.field === "basePrice" || editing.field === "defaultWidth") {
            value = Number(editValue);
        } else if (editing.field === "isDefault") {
            value = editValue === "true";
        }

        const result = await onSave(editing.id, editing.field, value);
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

