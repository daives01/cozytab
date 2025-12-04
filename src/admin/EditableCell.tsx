interface EditableCellProps {
    value: string;
    isEditing: boolean;
    editValue: string;
    onEdit: () => void;
    onChange: (value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    type?: "text" | "number";
    truncate?: boolean;
}

export function EditableCell({
    value,
    isEditing,
    editValue,
    onEdit,
    onChange,
    onSave,
    onCancel,
    type = "text",
    truncate = false,
}: EditableCellProps) {
    if (isEditing) {
        return (
            <input
                type={type}
                value={editValue}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onSave}
                onKeyDown={(e) => {
                    if (e.key === "Enter") onSave();
                    if (e.key === "Escape") onCancel();
                }}
                className="w-full px-2 py-1 bg-stone-700 border border-amber-500 rounded text-stone-100 focus:outline-none"
                autoFocus
            />
        );
    }

    return (
        <span
            className={`cursor-pointer hover:text-amber-300 transition-colors ${truncate ? "block max-w-[150px] truncate text-sm" : ""}`}
            onClick={onEdit}
            title={truncate ? value : undefined}
        >
            {value || <span className="text-stone-500 italic">empty</span>}
        </span>
    );
}

