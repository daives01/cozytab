import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, ShoppingBag, ExternalLink, Trash2 } from "lucide-react";
import type { Shortcut } from "../types";

interface ComputerScreenProps {
    shortcuts: Shortcut[];
    onClose: () => void;
    onUpdateShortcuts: (shortcuts: Shortcut[]) => void;
    onOpenShop: () => void;
}

export function ComputerScreen({
    shortcuts,
    onClose,
    onUpdateShortcuts,
    onOpenShop,
}: ComputerScreenProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [newShortcutName, setNewShortcutName] = useState("");
    const [newShortcutUrl, setNewShortcutUrl] = useState("");

    const handleAddShortcut = () => {
        if (!newShortcutName.trim() || !newShortcutUrl.trim()) return;

        const newShortcut: Shortcut = {
            id: crypto.randomUUID(),
            name: newShortcutName.trim(),
            url: newShortcutUrl.trim(),
        };

        onUpdateShortcuts([...shortcuts, newShortcut]);
        setNewShortcutName("");
        setNewShortcutUrl("");
    };

    const handleDeleteShortcut = (id: string) => {
        onUpdateShortcuts(shortcuts.filter((s) => s.id !== id));
    };

    const handleOpenShortcut = (url: string) => {
        window.open(url, "_blank");
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center font-['Patrick_Hand']"
            onClick={onClose}
        >
            <div
                className="bg-background border-4 border-foreground rounded-lg shadow-[8px_8px_0px_0px_rgba(31,41,55,1)] w-[90vw] max-w-4xl h-[80vh] max-h-[600px] flex flex-col p-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold">Computer</h2>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content Area */}
                <div className="flex-1 grid grid-cols-4 gap-4 overflow-y-auto pr-2">
                    {/* Shop Icon */}
                    <Card
                        className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 border-transparent hover:border-primary/50 flex flex-col items-center justify-center gap-2 min-h-[120px]"
                        onClick={onOpenShop}
                    >
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                            <ShoppingBag className="h-8 w-8 text-primary" />
                        </div>
                        <span className="font-['Patrick_Hand'] text-lg font-bold">
                            Shop
                        </span>
                    </Card>

                    {/* Shortcuts */}
                    {shortcuts.map((shortcut) => (
                        <Card
                            key={shortcut.id}
                            className="p-4 cursor-pointer hover:bg-accent transition-colors border-2 border-transparent hover:border-primary/50 flex flex-col items-center justify-center gap-2 min-h-[120px] relative group"
                        >
                            <button
                                onClick={() => handleOpenShortcut(shortcut.url)}
                                className="flex flex-col items-center gap-2 w-full"
                            >
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center">
                                    <ExternalLink className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <span className="font-['Patrick_Hand'] text-sm font-bold text-center">
                                    {shortcut.name}
                                </span>
                            </button>
                            {isEditing && (
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteShortcut(shortcut.id);
                                    }}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </Card>
                    ))}

                    {/* Add Shortcut Button (when editing) */}
                    {isEditing && (
                        <Card className="p-4 border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-2 min-h-[120px]">
                            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center">
                                <Plus className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <span className="font-['Patrick_Hand'] text-sm text-muted-foreground text-center">
                                Add Shortcut
                            </span>
                        </Card>
                    )}
                </div>

                {/* Edit Controls */}
                <div className="mt-6 pt-4 border-t border-border">
                    {isEditing ? (
                        <div className="space-y-4">
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Shortcut name"
                                    value={newShortcutName}
                                    onChange={(e) =>
                                        setNewShortcutName(e.target.value)
                                    }
                                    className="font-['Patrick_Hand']"
                                />
                                <Input
                                    placeholder="URL (e.g., https://example.com)"
                                    value={newShortcutUrl}
                                    onChange={(e) =>
                                        setNewShortcutUrl(e.target.value)
                                    }
                                    className="font-['Patrick_Hand']"
                                />
                                <Button
                                    onClick={handleAddShortcut}
                                    disabled={
                                        !newShortcutName.trim() ||
                                        !newShortcutUrl.trim()
                                    }
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add
                                </Button>
                            </div>
                            <Button
                                variant="outline"
                                onClick={() => setIsEditing(false)}
                                className="w-full"
                            >
                                Done Editing
                            </Button>
                        </div>
                    ) : (
                        <Button
                            variant="outline"
                            onClick={() => setIsEditing(true)}
                            className="w-full"
                        >
                            Edit Shortcuts
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

