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
};

type RoomTemplate = {
    _id: Id<"roomTemplates">;
    name: string;
    description?: string;
    basePrice: number;
    backgroundUrl: string;
    isDefault: boolean;
};

type EditingItem = {
    id: Id<"catalogItems">;
    field: keyof Omit<CatalogItem, "_id">;
};

type EditingTemplate = {
    id: Id<"roomTemplates">;
    field: keyof Omit<RoomTemplate, "_id">;
};

type Tab = "items" | "rooms";

export function AdminPage() {
    return (
        <SignedIn>
            <AdminContent />
        </SignedIn>
    );
}

function AdminContent() {
    const isAdmin = useQuery(api.users.isAdmin);
    const [activeTab, setActiveTab] = useState<Tab>("items");

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

    return (
        <div className="min-h-screen bg-stone-900 text-stone-100 p-8">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-amber-400">Admin Dashboard</h1>
                        <p className="text-stone-400 mt-1">Manage catalog items and room templates</p>
                    </div>
                    <a
                        href="/"
                        className="px-4 py-2 bg-stone-700 text-stone-100 rounded hover:bg-stone-600 transition-colors"
                    >
                        ← Back
                    </a>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 mb-6 border-b border-stone-700">
                    <button
                        onClick={() => setActiveTab("items")}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === "items"
                                ? "text-amber-400 border-b-2 border-amber-400"
                                : "text-stone-400 hover:text-stone-200"
                        }`}
                    >
                        Catalog Items
                    </button>
                    <button
                        onClick={() => setActiveTab("rooms")}
                        className={`px-4 py-2 font-medium transition-colors ${
                            activeTab === "rooms"
                                ? "text-amber-400 border-b-2 border-amber-400"
                                : "text-stone-400 hover:text-stone-200"
                        }`}
                    >
                        Room Templates
                    </button>
                </div>

                {activeTab === "items" ? <CatalogItemsTab /> : <RoomTemplatesTab />}
            </div>
        </div>
    );
}

function CatalogItemsTab() {
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
        defaultWidth: 150,
    });

    const startEdit = (item: CatalogItem, field: keyof Omit<CatalogItem, "_id">) => {
        setEditing({ id: item._id, field });
        setEditValue(String(item[field]));
    };

    const saveEdit = async () => {
        if (!editing) return;

        const updates: Record<string, string | number> = {};
        if (editing.field === "basePrice" || editing.field === "defaultWidth") {
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
            defaultWidth: 150,
        });
        setShowAddForm(false);
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-amber-500 text-stone-900 font-medium rounded hover:bg-amber-400 transition-colors"
                >
                    {showAddForm ? "Cancel" : "+ Add Item"}
                </button>
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
                            <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Width</th>
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
                                <td className="px-4 py-3">
                                    <EditableCell
                                        value={String(item.defaultWidth)}
                                        isEditing={editing?.id === item._id && editing?.field === "defaultWidth"}
                                        editValue={editValue}
                                        onEdit={() => startEdit(item, "defaultWidth")}
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
        </>
    );
}

function RoomTemplatesTab() {
    const roomTemplates = useQuery(api.roomTemplates.list);
    const updateTemplate = useMutation(api.roomTemplates.updateTemplate);
    const addTemplate = useMutation(api.roomTemplates.addTemplate);
    const seedDefault = useMutation(api.roomTemplates.seedDefault);
    const generateUploadUrl = useMutation(api.roomTemplates.generateUploadUrl);

    const [editing, setEditing] = useState<EditingTemplate | null>(null);
    const [editValue, setEditValue] = useState("");
    const [showAddForm, setShowAddForm] = useState(false);
    const [uploading, setUploading] = useState<Id<"roomTemplates"> | "new" | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [newTemplate, setNewTemplate] = useState({
        name: "",
        description: "",
        basePrice: 10,
        backgroundUrl: "",
        isDefault: false,
    });

    const startEdit = (template: RoomTemplate, field: keyof Omit<RoomTemplate, "_id">) => {
        setEditing({ id: template._id, field });
        if (field === "isDefault") {
            setEditValue(String(template[field]));
        } else {
            setEditValue(String(template[field] ?? ""));
        }
    };

    const saveEdit = async () => {
        if (!editing) return;

        const updates: Record<string, string | number | boolean> = {};
        if (editing.field === "basePrice") {
            updates[editing.field] = Number(editValue);
        } else if (editing.field === "isDefault") {
            updates[editing.field] = editValue === "true";
        } else {
            updates[editing.field] = editValue;
        }

        const result = await updateTemplate({ id: editing.id, ...updates });
        if (!result.success) {
            setError(result.message ?? "Failed to update template");
        }
        setEditing(null);
        setEditValue("");
    };

    const cancelEdit = () => {
        setEditing(null);
        setEditValue("");
    };

    const handleImageUpload = async (templateId: Id<"roomTemplates"> | "new", file: File) => {
        setUploading(templateId);
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

            if (templateId === "new") {
                setNewTemplate((prev) => ({ ...prev, backgroundUrl: imageUrl }));
            } else {
                await updateTemplate({ id: templateId, backgroundUrl: imageUrl });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(null);
        }
    };

    const handleAddTemplate = async () => {
        if (!newTemplate.name || !newTemplate.backgroundUrl) {
            setError("Name and background image are required");
            return;
        }

        const result = await addTemplate(newTemplate);
        if (!result.success) {
            setError("Failed to add template");
            return;
        }

        setNewTemplate({
            name: "",
            description: "",
            basePrice: 10,
            backgroundUrl: "",
            isDefault: false,
        });
        setShowAddForm(false);
    };

    const handleSeedDefault = async () => {
        try {
            const result = await seedDefault();
            if (!result.success) {
                setError(result.message ?? "Failed to seed default template");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to seed default");
        }
    };

    const hasDefault = roomTemplates?.some(t => t.isDefault);

    return (
        <>
            <div className="flex justify-end gap-2 mb-4">
                {!hasDefault && (
                    <button
                        onClick={handleSeedDefault}
                        className="px-4 py-2 bg-emerald-600 text-white font-medium rounded hover:bg-emerald-500 transition-colors"
                    >
                        Seed Default Room
                    </button>
                )}
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-4 py-2 bg-amber-500 text-stone-900 font-medium rounded hover:bg-amber-400 transition-colors"
                >
                    {showAddForm ? "Cancel" : "+ Add Room Template"}
                </button>
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
                    <h2 className="text-xl font-semibold mb-4 text-amber-300">Add New Room Template</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Name *</label>
                            <input
                                type="text"
                                value={newTemplate.name}
                                onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))}
                                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded text-stone-100 focus:outline-none focus:border-amber-500"
                                placeholder="e.g. Beach House"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Description</label>
                            <input
                                type="text"
                                value={newTemplate.description}
                                onChange={(e) => setNewTemplate((p) => ({ ...p, description: e.target.value }))}
                                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded text-stone-100 focus:outline-none focus:border-amber-500"
                                placeholder="A relaxing beachside room"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Price</label>
                            <input
                                type="number"
                                value={newTemplate.basePrice}
                                onChange={(e) => setNewTemplate((p) => ({ ...p, basePrice: Number(e.target.value) }))}
                                className="w-full px-3 py-2 bg-stone-700 border border-stone-600 rounded text-stone-100 focus:outline-none focus:border-amber-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-stone-400 mb-1">Background Image *</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newTemplate.backgroundUrl}
                                    onChange={(e) => setNewTemplate((p) => ({ ...p, backgroundUrl: e.target.value }))}
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
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="isDefault"
                                checked={newTemplate.isDefault}
                                onChange={(e) => setNewTemplate((p) => ({ ...p, isDefault: e.target.checked }))}
                                className="w-4 h-4"
                            />
                            <label htmlFor="isDefault" className="text-sm text-stone-400">
                                Set as default (free) room
                            </label>
                        </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                        <button
                            onClick={handleAddTemplate}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-500 transition-colors"
                        >
                            Add Template
                        </button>
                        {newTemplate.backgroundUrl && (
                            <div className="ml-4 flex items-center gap-2">
                                <span className="text-sm text-stone-400">Preview:</span>
                                <AssetImage assetUrl={newTemplate.backgroundUrl} className="w-20 h-12 object-cover rounded" />
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="bg-stone-800 rounded-lg border border-stone-700 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-stone-700">
                        <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Preview</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Name</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Description</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Price</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Default</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-stone-300">Background URL</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-700">
                        {roomTemplates?.map((template) => (
                            <tr key={template._id} className="hover:bg-stone-750">
                                <td className="px-4 py-3">
                                    <div className="relative group">
                                        <AssetImage
                                            assetUrl={template.backgroundUrl}
                                            className="w-24 h-14 object-cover rounded"
                                        />
                                        <label className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity rounded">
                                            <span className="text-xs">
                                                {uploading === template._id ? "..." : "📤"}
                                            </span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleImageUpload(template._id, file);
                                                }}
                                            />
                                        </label>
                                    </div>
                                </td>
                                <td className="px-4 py-3">
                                    <EditableCell
                                        value={template.name}
                                        isEditing={editing?.id === template._id && editing?.field === "name"}
                                        editValue={editValue}
                                        onEdit={() => startEdit(template, "name")}
                                        onChange={setEditValue}
                                        onSave={saveEdit}
                                        onCancel={cancelEdit}
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <EditableCell
                                        value={template.description ?? ""}
                                        isEditing={editing?.id === template._id && editing?.field === "description"}
                                        editValue={editValue}
                                        onEdit={() => startEdit(template, "description")}
                                        onChange={setEditValue}
                                        onSave={saveEdit}
                                        onCancel={cancelEdit}
                                        truncate
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    <EditableCell
                                        value={String(template.basePrice)}
                                        isEditing={editing?.id === template._id && editing?.field === "basePrice"}
                                        editValue={editValue}
                                        onEdit={() => startEdit(template, "basePrice")}
                                        onChange={setEditValue}
                                        onSave={saveEdit}
                                        onCancel={cancelEdit}
                                        type="number"
                                    />
                                </td>
                                <td className="px-4 py-3">
                                    {template.isDefault ? (
                                        <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                                            Default
                                        </span>
                                    ) : (
                                        <button
                                            onClick={async () => {
                                                await updateTemplate({ id: template._id, isDefault: true });
                                            }}
                                            className="text-stone-400 hover:text-amber-300 text-xs underline"
                                        >
                                            Set as default
                                        </button>
                                    )}
                                </td>
                                <td className="px-4 py-3">
                                    <EditableCell
                                        value={template.backgroundUrl}
                                        isEditing={editing?.id === template._id && editing?.field === "backgroundUrl"}
                                        editValue={editValue}
                                        onEdit={() => startEdit(template, "backgroundUrl")}
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
                {(!roomTemplates || roomTemplates.length === 0) && (
                    <div className="p-8 text-center text-stone-400">
                        No room templates found. Click "Seed Default Room" to create the starter room.
                    </div>
                )}
            </div>
        </>
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
            {value || <span className="text-stone-500 italic">empty</span>}
        </span>
    );
}
