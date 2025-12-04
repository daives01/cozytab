import { useState } from "react";
import { SignedIn } from "@clerk/clerk-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AssetImage } from "../components/AssetImage";

type CatalogItem = {
    _id: Id<"catalogItems">;
    name: string;
    category: string;
    basePrice: number;
    assetUrl: string;
    defaultWidth: number;
    defaultHeight: number;
};

type EditingItem = {
    id: Id<"catalogItems">;
    field: keyof Omit<CatalogItem, "_id">;
};

export function AdminPage() {
    return (
        <SignedIn>
            <AdminContent />
        </SignedIn>
    );
}

function AdminContent() {
    const isAdmin = useQuery(api.users.isAdmin);
    const catalogItems = useQuery(api.catalog.list);
    const updateItem = useMutation(api.catalog.updateItem);
    const addItem = useMutation(api.catalog.addItem);
    const generateUploadUrl = useMutation(api.catalog.generateUploadUrl);

    const [editing, setEditing] = useState<EditingItem | null>(null);
    const [editValue, setEditValue] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [uploading, setUploading] = useState<Id<"catalogItems"> | "new" | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [newItem, setNewItem] = useState({
        name: "",
        category: "furniture",
        basePrice: 0,
        assetUrl: "",
        defaultWidth: 100,
        defaultHeight: 100,
    });

    if (isAdmin === undefined) {
        return (
            <div className="min-h-screen bg-stone-900 text-stone-100 flex items-center justify-center">
                <p>Loading...</p>
            </div>
        );
    }

    if (!isAdmin) {
        return (
            <div className="min-h-screen bg-stone-900 text-stone-100 flex flex-col items-center justify-center gap-6">
                <h1 className="text-6xl font-bold text-stone-400">404</h1>
                <p className="text-stone-400 text-lg">Page not found</p>
                <a
                    href="/"
                    className="px-6 py-3 bg-amber-500 text-stone-900 font-medium rounded hover:bg-amber-400 transition-colors"
                >
                    Go to Home
                </a>
            </div>
        );
    }

    const startEdit = (item: CatalogItem, field: keyof Omit<CatalogItem, "_id">) => {
        setEditing({ id: item._id, field });
        setEditValue(String(item[field]));
    };

    const saveEdit = async () => {
        if (!editing) return;

        const updates: Record<string, string | number> = {};
        if (editing.field === "basePrice" || editing.field === "defaultWidth" || editing.field === "defaultHeight") {
            updates[editing.field] = Number(editValue);
        } else {
            updates[editing.field] = editValue;
        }

        const result = await updateItem({ id: editing.id, ...updates });
        if (!result.success) {
            setError(result.message ?? "Failed to update item");
        }
        setEditing(null);
        setEditValue("");
    };

    const cancelEdit = () => {
        setEditing(null);
        setEditValue("");
    };

    const handleImageUpload = async (itemId: Id<"catalogItems"> | "new", file: File) => {
        setUploading(itemId);
        setError(null);

        try {
            const uploadUrl = await generateUploadUrl();
            const result = await fetch(uploadUrl, {
                method: "POST",
                headers: { "Content-Type": file.type },
                body: file,
            });

            if (!result.ok) {
                throw new Error("Upload failed");
            }

            const { storageId } = await result.json();
            const imageUrl = `storage:${storageId}`;

            if (itemId === "new") {
                setNewItem((prev) => ({ ...prev, assetUrl: imageUrl }));
            } else {
                await updateItem({ id: itemId, assetUrl: imageUrl });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(null);
        }
    };

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
            defaultWidth: 100,
            defaultHeight: 100,
        });
        setShowAddForm(false);
    };

    return (
        <div className="min-h-screen bg-stone-900 text-stone-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-amber-400">Catalog Admin</h1>
                        <p className="text-stone-400 mt-1">Manage catalog items</p>
                    </div>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="px-4 py-2 bg-amber-500 text-stone-900 font-medium rounded hover:bg-amber-400 transition-colors"
                        >
                            {showAddForm ? "Cancel" : "+ Add Item"}
                        </button>
                        <a
                            href="/"
                            className="px-4 py-2 bg-stone-700 text-stone-100 rounded hover:bg-stone-600 transition-colors"
                        >
                            ← Back
                        </a>
                    </div>
                </div>

                {error && (
                    <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200">
                        {error}
                        <button onClick={() => setError(null)} className="ml-4 underline">
                            Dismiss
                        </button>
                    </div>
                )}

                {showAddForm && (
                    <div className="mb-8 p-6 bg-stone-800 rounded-lg border border-stone-700">
                        <h2 className="text-xl font-semibold mb-4 text-amber-300">Add New Item</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Name *</label>
                                <input
                                    type="text"
                                    value={newItem.name}
                                    onChange={(e) => setNewItem((p) => ({ ...p, name: e.target.value }))}
                                    className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded text-stone-100 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Category</label>
                                <input
                                    type="text"
                                    value={newItem.category}
                                    onChange={(e) => setNewItem((p) => ({ ...p, category: e.target.value }))}
                                    className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded text-stone-100 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Price</label>
                                <input
                                    type="number"
                                    value={newItem.basePrice}
                                    onChange={(e) => setNewItem((p) => ({ ...p, basePrice: Number(e.target.value) }))}
                                    className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded text-stone-100 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Width (px)</label>
                                <input
                                    type="number"
                                    value={newItem.defaultWidth}
                                    onChange={(e) => setNewItem((p) => ({ ...p, defaultWidth: Number(e.target.value) }))}
                                    className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded text-stone-100 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Height (px)</label>
                                <input
                                    type="number"
                                    value={newItem.defaultHeight}
                                    onChange={(e) => setNewItem((p) => ({ ...p, defaultHeight: Number(e.target.value) }))}
                                    className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded text-stone-100 focus:outline-none focus:border-amber-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-stone-400 mb-1">Image *</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newItem.assetUrl}
                                        onChange={(e) => setNewItem((p) => ({ ...p, assetUrl: e.target.value }))}
                                        placeholder="URL or upload"
                                        className="flex-1 px-3 py-2 bg-stone-700 border border-stone-600 rounded text-stone-100 focus:outline-none focus:border-amber-500 text-sm"
                                    />
                                    <label className="px-3 py-2 bg-stone-600 hover:bg-stone-500 rounded cursor-pointer transition-colors text-sm">
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
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
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

                <div className="bg-stone-800 rounded-lg border border-stone-700 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-stone-700">
                            <tr>
                                <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Image</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Name</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Category</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Price</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Size</th>
                                <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Asset URL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-700">
                            {catalogItems?.map((item) => (
                                <tr key={item._id} className="hover:bg-stone-750">
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
                                            onEdit={() => startEdit(item, "name")}
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
                                            onEdit={() => startEdit(item, "category")}
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
                                            onEdit={() => startEdit(item, "basePrice")}
                                            onChange={setEditValue}
                                            onSave={saveEdit}
                                            onCancel={cancelEdit}
                                            type="number"
                                        />
                                    </td>
                                    <td className="px-4 py-3 text-sm text-stone-400">
                                        <span
                                            className="cursor-pointer hover:text-stone-200"
                                            onClick={() => startEdit(item, "defaultWidth")}
                                        >
                                            {editing?.id === item._id && editing?.field === "defaultWidth" ? (
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={saveEdit}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") saveEdit();
                                                        if (e.key === "Escape") cancelEdit();
                                                    }}
                                                    className="w-12 px-1 bg-stone-700 border border-amber-500 rounded text-stone-100 text-sm"
                                                    autoFocus
                                                />
                                            ) : (
                                                item.defaultWidth
                                            )}
                                        </span>
                                        ×
                                        <span
                                            className="cursor-pointer hover:text-stone-200"
                                            onClick={() => startEdit(item, "defaultHeight")}
                                        >
                                            {editing?.id === item._id && editing?.field === "defaultHeight" ? (
                                                <input
                                                    type="number"
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onBlur={saveEdit}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") saveEdit();
                                                        if (e.key === "Escape") cancelEdit();
                                                    }}
                                                    className="w-12 px-1 bg-stone-700 border border-amber-500 rounded text-stone-100 text-sm"
                                                    autoFocus
                                                />
                                            ) : (
                                                item.defaultHeight
                                            )}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <EditableCell
                                            value={item.assetUrl}
                                            isEditing={editing?.id === item._id && editing?.field === "assetUrl"}
                                            editValue={editValue}
                                            onEdit={() => startEdit(item, "assetUrl")}
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
                        <div className="p-8 text-center text-stone-400">No catalog items found.</div>
                    )}
                </div>
            </div>
        </div>
    );
}

function EditableCell({
    value,
    isEditing,
    editValue,
    onEdit,
    onChange,
    onSave,
    onCancel,
    type = "text",
    truncate = false,
}: {
    value: string;
    isEditing: boolean;
    editValue: string;
    onEdit: () => void;
    onChange: (value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    type?: "text" | "number";
    truncate?: boolean;
}) {
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
            {value}
        </span>
    );
}
