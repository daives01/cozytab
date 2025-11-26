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
        <div className="w-80 bg-[#fffdf5] rounded-xl shadow-[4px_4px_0px_0px_rgba(31,41,55,1)] border-2 border-gray-800 p-6 rotate-1 font-['Patrick_Hand']">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <h3 className="font-bold text-2xl text-gray-800">{item.catalogItemId}</h3>
                    <p className="text-gray-500 text-sm font-bold">ID: {item.id.slice(0, 8)}...</p>
                </div>
                <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-200 border-2 border-transparent hover:border-gray-800 transition-all font-bold text-xl"
                >
                    ×
                </button>
            </div>

            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                        🔗 Link URL
                    </label>
                    <input
                        type="text"
                        value={item.url || ""}
                        onChange={(e) => onChange({ url: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-0 outline-none transition-colors font-sans text-sm"
                    />
                    {item.url && (
                        <a
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block mt-2 text-xs text-blue-600 hover:underline font-bold text-right"
                        >
                            Test Link →
                        </a>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200">
                        <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Position</span>
                        <div className="font-mono text-sm text-gray-700">
                            X: {Math.round(item.x)}<br />
                            Y: {Math.round(item.y)}
                        </div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200">
                        <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Transform</span>
                        <div className="font-mono text-sm text-gray-700">
                            S: {item.scaleX.toFixed(2)}<br />
                            R: {Math.round(item.rotation)}°
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
