import { Home, Coins, Check } from "lucide-react";
import type { Doc, Id } from "../../../convex/_generated/dataModel";
import { AssetImage } from "../../components/AssetImage";

interface RoomsTabProps {
    purchasableRooms: Doc<"roomTemplates">[];
    ownedTemplateSet: Set<Id<"roomTemplates">>;
    userCurrency: number;
    purchasingRoom: Id<"roomTemplates"> | null;
    lastRoomResult: { templateId: Id<"roomTemplates">; message: string; success: boolean } | null;
    onPurchaseRoom: (templateId: Id<"roomTemplates">) => void;
}

export function RoomsTab({
    purchasableRooms,
    ownedTemplateSet,
    userCurrency,
    purchasingRoom,
    lastRoomResult,
    onPurchaseRoom,
}: RoomsTabProps) {
    if (purchasableRooms.length === 0) {
        return (
            <div className="text-center py-12 text-[#8b7355]">
                <Home className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">No rooms available yet!</p>
                <p className="text-sm mt-2">Check back later for new room themes.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-[#5c4d3c] mb-2">Room Themes</h3>
                <p className="text-[#8b7355]">Purchase new rooms to customize your space!</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {purchasableRooms.map((template) => {
                    const isOwned = ownedTemplateSet.has(template._id);
                    const canAfford = userCurrency >= template.basePrice;
                    const isPurchasing = purchasingRoom === template._id;
                    const resultForRoom = lastRoomResult?.templateId === template._id ? lastRoomResult : null;

                    return (
                        <div
                            key={template._id}
                            className={`relative bg-white rounded-2xl border-4 overflow-hidden transition-all ${
                                isOwned
                                    ? "border-emerald-400 bg-emerald-50"
                                    : "border-[#d4c3aa] hover:border-rose-400 hover:shadow-xl hover:-translate-y-1"
                            }`}
                        >
                            {isOwned && (
                                <div className="absolute top-3 right-3 bg-emerald-500 text-white rounded-full p-1.5 shadow-lg z-10">
                                    <Check className="h-5 w-5" />
                                </div>
                            )}

                            <div className="aspect-video bg-gray-200 relative overflow-hidden">
                                <AssetImage
                                    assetUrl={template.backgroundUrl}
                                    alt={template.name}
                                    className="object-cover w-full h-full"
                                    draggable={false}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <h4 className="font-bold text-white text-xl drop-shadow-lg">
                                        {template.name}
                                    </h4>
                                    {template.description && (
                                        <p className="text-white/80 text-sm mt-0.5 drop-shadow-md line-clamp-1">
                                            {template.description}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="p-4">
                                {isOwned ? (
                                    <div className="text-center text-emerald-600 font-bold text-lg py-1">
                                        ✓ Owned
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onPurchaseRoom(template._id)}
                                        disabled={!canAfford || isPurchasing}
                                        className={`w-full py-3 px-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 ${
                                            isPurchasing
                                                ? "bg-gray-300 text-gray-500 cursor-wait"
                                                : canAfford
                                                ? "bg-gradient-to-r from-rose-500 to-pink-500 text-white hover:from-rose-600 hover:to-pink-600 shadow-lg active:scale-[0.98]"
                                                : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                        }`}
                                    >
                                        <Coins className="h-5 w-5" />
                                        <span>{template.basePrice} tokens</span>
                                    </button>
                                )}

                                {resultForRoom && (
                                    <div
                                        className={`mt-3 text-sm text-center font-medium ${
                                            resultForRoom.success ? "text-emerald-600" : "text-red-500"
                                        }`}
                                    >
                                        {resultForRoom.message}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

