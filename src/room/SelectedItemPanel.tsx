import type { RoomItem } from "../types";

interface SelectedItemPanelProps {
    item: RoomItem;
    onChange: (updates: Partial<RoomItem>) => void;
    onClose: () => void;
}

export function SelectedItemPanel({
    item,
    onChange,
    onClose,
}: SelectedItemPanelProps) {
    return (
        <div className="absolute top-20 right-4 w-80 bg-white rounded-lg shadow-xl p-4 border border-gray-200 z-50">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg">Edit Item</h2>
                <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item Type
                    </label>
                    <div className="p-2 bg-gray-100 rounded text-gray-600 text-sm">
                        {item.catalogItemId}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Link URL
                    </label>
                    <input
                        type="url"
                        value={item.url || ""}
                        onChange={(e) => onChange({ url: e.target.value })}
                        placeholder="https://example.com"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Clicking this item in View mode will open this URL.
                    </p>
                </div>

                {item.url && (
                    <div className="pt-2">
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                        >
                            Test Link ↗
                        </a>
                    </div>
                )}

                <div className="pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <div>X: {Math.round(item.x)}</div>
                        <div>Y: {Math.round(item.y)}</div>
                        <div>Scale: {item.scaleX.toFixed(2)}</div>
                        <div>Rot: {Math.round(item.rotation)}°</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
