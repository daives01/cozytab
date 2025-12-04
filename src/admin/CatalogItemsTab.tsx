import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AssetImage } from "../components/AssetImage";
import { EditableCell } from "./EditableCell";
import { useImageUpload } from "./hooks/useImageUpload";
import { useEditableField } from "./hooks/useEditableField";

export function CatalogItemsTab() {
    const catalogItems = useQuery(api.catalog.list);
    const updateItem = useMutation(api.catalog.updateItem);
    const addItem = useMutation(api.catalog.addItem);
    const generateUploadUrl = useMutation(api.catalog.generateUploadUrl);

    const [showAddForm, setShowAddForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [newItem, setNewItem] = useState({
        name: "",
        category: "furniture",
        basePrice: 0,
        assetUrl: "",
        defaultWidth: 150,
    });

    const { editing, editValue, startEdit, saveEdit, cancelEdit, setEditValue } = useEditableField<"catalogItems">({
        onSave: async (id, field, value) => {
            const updates: Record<string, string | number | boolean> = { [field]: value };
            return await updateItem({ id: id as Id<"catalogItems">, ...updates });
        },
        onError: setError,
    });

    const { uploading, error: uploadError, handleImageUpload, setError: setUploadError } = useImageUpload<"catalogItems">({
        generateUploadUrl,
        onUploadComplete: async (itemId, imageUrl) => {
            if (itemId === "new") {
                setNewItem((prev) => ({ ...prev, assetUrl: imageUrl }));
            } else {
                await updateItem({ id: itemId, assetUrl: imageUrl });
            }
        },
    });

    const currentError = error || uploadError;

    const handleAddItem = async () => {
        if (!newItem.name || !newItem.assetUrl) {
            setError("Name and image are required");
            return;
        }

        const result = await addItem(newItem);
        if (!result.success) {
            setError(result.message ?? "Failed to add item");
            return;
        }

        setNewItem({
            name: "",
            category: "furniture",
            basePrice: 0,
            assetUrl: "",
            defaultWidth: 150,
        });
        setShowAddForm(false);
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-[var(--warning)] text-[var(--ink)] font-semibold rounded-lg border-2 border-[var(--ink)] shadow-md hover:shadow-lg active:shadow-sm active:translate-x-[2px] active:translate-y-[2px] transition-all"
                >
                    {showAddForm ? "Cancel" : "+ Add Item"}
                </button>
            </div>

            {currentError && (
                <div className="mb-4 p-3 bg-[var(--danger-light)] border-2 border-[var(--danger)] rounded-lg text-[var(--danger-dark)] shadow-sm">
                    {currentError}
                    <button onClick={() => { setError(null); setUploadError(null); }} className="ml-4 underline">
                        Dismiss
                    </button>
                </div>
            )}

            {showAddForm && (
                <div className="mb-8 p-6 bg-[var(--paper-header)] rounded-lg border-2 border-[var(--ink)] shadow-md">
                    <h2 className="text-xl font-semibold mb-4 text-[var(--ink)]">Add New Item</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-[var(--ink-muted)] mb-1">Name *</label>
                            <input
                                type="text"
                                value={newItem.name}
                                onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                                className="w-full px-3 py-2 bg-white border-2 border-[var(--ink)] rounded-lg text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--warning)] focus:ring-offset-1 shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--ink-muted)] mb-1">Category</label>
                            <input
                                type="text"
                                value={newItem.category}
                                onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                                className="w-full px-3 py-2 bg-white border-2 border-[var(--ink)] rounded-lg text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--warning)] focus:ring-offset-1 shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--ink-muted)] mb-1">Price</label>
                            <input
                                type="number"
                                value={newItem.basePrice}
                                onChange={(e) => setNewItem((p) => ({ ...p, basePrice: Number(e.target.value) }))}
                                className="w-full px-3 py-2 bg-white border-2 border-[var(--ink)] rounded-lg text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--warning)] focus:ring-offset-1 shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--ink-muted)] mb-1">Width (px)</label>
                            <input
                                type="number"
                                value={newItem.defaultWidth}
                                onChange={(e) => setNewItem((p) => ({ ...p, defaultWidth: Number(e.target.value) }))}
                                className="w-full px-3 py-2 bg-white border-2 border-[var(--ink)] rounded-lg text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--warning)] focus:ring-offset-1 shadow-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--ink-muted)] mb-1">Image *</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newItem.assetUrl}
                                    onChange={(e) => setNewItem((p) => ({ ...p, assetUrl: e.target.value }))}
                                    placeholder="URL or upload"
                                    className="flex-1 px-3 py-2 bg-white border-2 border-[var(--ink)] rounded-lg text-[var(--ink)] focus:outline-none focus:ring-2 focus:ring-[var(--warning)] focus:ring-offset-1 text-sm shadow-sm"
                                />
                                <label className="px-3 py-2 bg-[var(--paper-header)] hover:bg-[var(--secondary)] border-2 border-[var(--ink)] rounded-lg cursor-pointer transition-colors text-sm shadow-sm">
                                    {uploading === "new" ? "..." : "📤"}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleImageUpload("new", file);
                                        }}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={handleAddItem}
                            className="px-4 py-2 bg-[var(--success)] text-white rounded-lg border-2 border-[var(--ink)] shadow-md hover:shadow-lg active:shadow-sm active:translate-x-[2px] active:translate-y-[2px] transition-all font-semibold"
                        >
                            Add Item
                        </button>
                        {newItem.assetUrl && (
                            <div className="ml-4 flex items-center gap-2">
                                <span className="text-sm text-stone-400">Preview:</span>
                                <AssetImage assetUrl={newItem.assetUrl} className="w-10 h-10 object-contain" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-[var(--paper-header)] rounded-lg border-2 border-[var(--ink)] overflow-hidden shadow-md">
                <table className="w-full">
                    <thead className="bg-[var(--paper-header)] border-b-2 border-[var(--ink)]">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--ink)]">Image</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--ink)]">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--ink)]">Category</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--ink)]">Price</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--ink)]">Width</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--ink)]">Asset URL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--ink)]/20">
                        {catalogItems?.map((item) => (
                            <tr key={item._id} className="hover:bg-[var(--paper)]/50">
                                <td className="px-4 py-3">
                                    <div className="relative group">
                                        <AssetImage
                                            assetUrl={item.assetUrl}
                                            className="w-12 h-12 object-contain rounded"
                                        />
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded">
                                            <span className="text-xs">
                                                {uploading === item._id ? "..." : "📤"}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleImageUpload(item._id, file);
                                                }}
                                            />
                                        </label>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <EditableCell
                                        value={item.name}
                                        isEditing={editing?.id === item._id && editing?.field === "name"}
                                        editValue={editValue}
                                        onEdit={() => startEdit(item._id, "name", item.name)}
                                        onChange={setEditValue}
                                        onSave={saveEdit}
                                        onCancel={cancelEdit}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <EditableCell
                                        value={item.category}
                                        isEditing={editing?.id === item._id && editing?.field === "category"}
                                        editValue={editValue}
                                        onEdit={() => startEdit(item._id, "category", item.category)}
                                        onChange={setEditValue}
                                        onSave={saveEdit}
                                        onCancel={cancelEdit}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <EditableCell
                                        value={String(item.basePrice)}
                                        isEditing={editing?.id === item._id && editing?.field === "basePrice"}
                                        editValue={editValue}
                                        onEdit={() => startEdit(item._id, "basePrice", item.basePrice)}
                                        onChange={setEditValue}
                                        onSave={saveEdit}
                                        onCancel={cancelEdit}
                                        type="number"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <EditableCell
                                        value={String(item.defaultWidth)}
                                        isEditing={editing?.id === item._id && editing?.field === "defaultWidth"}
                                        editValue={editValue}
                                        onEdit={() => startEdit(item._id, "defaultWidth", item.defaultWidth)}
                                        onChange={setEditValue}
                                        onSave={saveEdit}
                                        onCancel={cancelEdit}
                                        type="number"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <EditableCell
                                        value={item.assetUrl}
                                        isEditing={editing?.id === item._id && editing?.field === "assetUrl"}
                                        editValue={editValue}
                                        onEdit={() => startEdit(item._id, "assetUrl", item.assetUrl)}
                                        onChange={setEditValue}
                                        onSave={saveEdit}
                                        onCancel={cancelEdit}
                                        truncate
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {(!catalogItems || catalogItems.length === 0) && (
                    <div className="p-8 text-center text-[var(--ink-subtle)]">No catalog items found.</div>
                )}
            </div>
        </>
    );
}

