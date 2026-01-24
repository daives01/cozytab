import type { Shortcut } from "@shared/guestTypes";

export type ContextMenuState =
    | { target: "shortcut"; id: string; x: number; y: number }
    | { target: "desktop"; x: number; y: number; row: number; col: number }
    | null;

interface DesktopContextMenuProps {
    contextMenu: ContextMenuState;
    shortcuts: Shortcut[];
    onOpen: (shortcut: Shortcut) => void;
    onRename: (id: string) => void;
    onDelete: (id: string) => void;
    onStartAdd: (row: number, col: number, x: number, y: number) => void;
}

export function DesktopContextMenu({
    contextMenu,
    shortcuts,
    onOpen,
    onRename,
    onDelete,
    onStartAdd,
}: DesktopContextMenuProps) {
    if (!contextMenu) return null;

    const style = { top: contextMenu.y, left: contextMenu.x };

    if (contextMenu.target === "shortcut") {
        const shortcut = shortcuts.find((s) => s.id === contextMenu.id);
        if (!shortcut) return null;

        return (
            <div
                className="fixed z-[120] bg-white border border-stone-300 rounded shadow-lg text-sm"
                style={style}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col">
                    <button
                        className="px-3 py-2 hover:bg-slate-50 text-left w-full"
                        onClick={() => {
                            onOpen(shortcut);
                        }}
                    >
                        Open
                    </button>
                    <button
                        className="px-3 py-2 hover:bg-slate-50 text-left w-full"
                        onClick={() => onRename(contextMenu.id)}
                    >
                        Rename
                    </button>
                    <button
                        className="px-3 py-2 hover:bg-red-50 text-left text-red-600 w-full flex items-center gap-2"
                        onClick={() => onDelete(contextMenu.id)}
                    >
                        Delete
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed z-[120] bg-white border border-stone-300 rounded shadow-lg text-sm"
            style={style}
            onClick={(e) => e.stopPropagation()}
        >
            <button
                className="px-3 py-2 hover:bg-slate-50 text-left w-full"
                onClick={() =>
                    onStartAdd(contextMenu.row, contextMenu.col, contextMenu.x, contextMenu.y)
                }
            >
                New Shortcut
            </button>
        </div>
    );
}
