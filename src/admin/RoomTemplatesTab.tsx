import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AssetImage } from "../components/AssetImage";
import { EditableCell } from "./EditableCell";
import { useImageUpload } from "./hooks/useImageUpload";
import { useEditableField } from "./hooks/useEditableField";

export function RoomTemplatesTab() {
    const roomTemplates = useQuery(api.roomTemplates.list);
    const updateTemplate = useMutation(api.roomTemplates.updateTemplate);
    const addTemplate = useMutation(api.roomTemplates.addTemplate);
    const seedDefault = useMutation(api.roomTemplates.seedDefault);
    const generateUploadUrl = useMutation(api.roomTemplates.generateUploadUrl);

    const [showAddForm, setShowAddForm] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [newTemplate, setNewTemplate] = useState({
        name: "",
        description: "",
        basePrice: 10,
        backgroundUrl: "",
        isDefault: false,
    });

    const { editing, editValue, startEdit, saveEdit, cancelEdit, setEditValue } = useEditableField<"roomTemplates">({
        onSave: async (id, field, value) => {
            const updates: Record<string, string | number | boolean> = { [field]: value };
            return await updateTemplate({ id: id as Id<"roomTemplates">, ...updates });
        },
        onError: setError,
    });

    const { uploading, error: uploadError, handleImageUpload, setError: setUploadError } = useImageUpload<"roomTemplates">({
        generateUploadUrl,
        onUploadComplete: async (templateId, imageUrl) => {
            if (templateId === "new") {
                setNewTemplate((prev) => ({ ...prev, backgroundUrl: imageUrl }));
            } else {
                await updateTemplate({ id: templateId, backgroundUrl: imageUrl });
            }
        },
    });

    const currentError = error || uploadError;

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

            {currentError && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200">
                    {currentError}
                    <button onClick={() => { setError(null); setUploadError(null); }} className="ml-4 underline">
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
                                        onEdit={() => startEdit(template._id, "name", template.name)}
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
                                        onEdit={() => startEdit(template._id, "description", template.description ?? "")}
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
                                        onEdit={() => startEdit(template._id, "basePrice", template.basePrice)}
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
                                        onEdit={() => startEdit(template._id, "backgroundUrl", template.backgroundUrl)}
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

