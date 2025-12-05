import { Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClerk } from "@clerk/clerk-react";

interface ShortcutsEditorProps {
    newShortcutName: string;
    newShortcutUrl: string;
    onNewShortcutNameChange: (value: string) => void;
    onNewShortcutUrlChange: (value: string) => void;
    onAddShortcut: () => void;
}

export function ShortcutsEditor({
    newShortcutName,
    newShortcutUrl,
    onNewShortcutNameChange,
    onNewShortcutUrlChange,
    onAddShortcut,
}: ShortcutsEditorProps) {
    const { signOut } = useClerk();

    return (
        <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-2 duration-200">
            <div className="flex gap-2 items-center bg-white/50 p-2 rounded border border-stone-300">
                <Plus className="h-4 w-4 text-stone-400 shrink-0" />
                <Input
                    placeholder="Shortcut name"
                    value={newShortcutName}
                    onChange={(e) => onNewShortcutNameChange(e.target.value)}
                    className="h-8 text-sm bg-white border-stone-300 focus:border-blue-400 flex-1"
                />
                <Input
                    placeholder="https://..."
                    value={newShortcutUrl}
                    onChange={(e) => onNewShortcutUrlChange(e.target.value)}
                    className="h-8 text-sm bg-white border-stone-300 focus:border-blue-400 flex-[1.5]"
                />
                <Button
                    size="sm"
                    onClick={onAddShortcut}
                    disabled={!newShortcutName.trim() || !newShortcutUrl.trim()}
                    className="h-8 px-4 bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white shadow-sm border border-blue-700 disabled:opacity-50"
                >
                    Add
                </Button>
            </div>

            <div className="flex items-center justify-end gap-3">
                <span className="text-xs text-stone-500">
                    Right-click a shortcut to rename or delete it
                </span>
                <button
                    onClick={() => signOut()}
                    className="p-1.5 hover:bg-red-100 rounded transition-colors group border border-transparent hover:border-red-200"
                    title="Log Out"
                >
                    <LogOut className="h-4 w-4 text-stone-400 group-hover:text-red-500 transition-colors" />
                </button>
            </div>
        </div>
    );
}

