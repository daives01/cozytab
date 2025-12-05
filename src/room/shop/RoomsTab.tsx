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
    isGuest?: boolean;
}

export function RoomsTab({
    purchasableRooms,
    ownedTemplateSet,
    userCurrency,
    purchasingRoom,
    lastRoomResult,
    onPurchaseRoom,
    isGuest = false,
}: RoomsTabProps) {
    if (purchasableRooms.length === 0) {
        return (
            <div className="text-center py-12 text-[var(--ink-subtle)]">
                <Home className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-xl">No rooms available yet!</p>
                <p className="text-sm mt-2">Check back later for new room themes.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-[var(--ink)] mb-2">Room Themes</h3>
                <p className="text-[var(--ink-subtle)]">Purchase new rooms to customize your space!</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {purchasableRooms.map((template) => {
                    const isOwned = ownedTemplateSet.has(template._id);
                    const guestLocked = isGuest && !isOwned;
                    const canAfford = !guestLocked && userCurrency >= template.basePrice;
                    const isPurchasing = purchasingRoom === template._id;
                    const resultForRoom = lastRoomResult?.templateId === template._id ? lastRoomResult : null;
                    const cardClasses = isOwned
                        ? "border-[var(--success)] bg-[var(--success-light)]"
                        : "border-[var(--ink)] hover:border-[var(--danger)] hover:shadow-lg hover:-translate-y-1";

                    const renderAction = () => {
                        if (isOwned) {
                            return (
                                <div className="text-center text-[var(--success-dark)] font-bold text-lg py-1">
                                    ✓ Owned
                                </div>
                            );
                        }

                        if (guestLocked) {
                            return (
                                <div className="text-center text-[var(--ink)] font-bold text-lg py-2 border-2 border-[var(--ink)] rounded-xl bg-[var(--muted)] shadow-inner">
                                    Log in to purchase rooms!
                                </div>
                            );
                        }

                        const buttonStateClasses = isPurchasing
                            ? "bg-[var(--muted)] text-[var(--ink-subtle)] cursor-wait border-[var(--ink)]"
                            : canAfford
                            ? "bg-[var(--danger)] text-white hover:bg-[var(--danger-dark)] border-[var(--ink)] shadow-md active:scale-[0.98] active:shadow-sm active:translate-x-[2px] active:translate-y-[2px]"
                            : "bg-[var(--muted)] text-[var(--ink-subtle)] cursor-not-allowed border-[var(--ink)]";

                        return (
                            <button
                                onClick={() => onPurchaseRoom(template._id)}
                                disabled={!canAfford || isPurchasing}
                                className={`w-full py-3 px-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-2 border-2 ${buttonStateClasses}`}
                            >
                                <Coins className="h-5 w-5" />
                                <span>{template.basePrice} tokens</span>
                            </button>
                        );
                    };

                    return (
                        <div
                            key={template._id}
                            className={`relative bg-white rounded-2xl border-2 overflow-hidden transition-all shadow-md ${cardClasses}`}
                        >
                            {isOwned && (
                                <div className="absolute top-3 right-3 bg-[var(--success)] text-white rounded-full p-1.5 shadow-md border-2 border-[var(--ink)] z-10">
                                    <Check className="h-5 w-5" />
                                </div>
                            )}

                            <div className="aspect-video bg-[var(--muted)] relative overflow-hidden">
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
                                {renderAction()}

                                {resultForRoom && (
                                    <div
                                        className={`mt-3 text-sm text-center font-medium ${
                                            resultForRoom.success ? "text-[var(--success-dark)]" : "text-[var(--danger)]"
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

