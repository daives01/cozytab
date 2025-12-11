import { CheckCircle2, Home } from "lucide-react";
import type { Id } from "@convex/_generated/dataModel";
import { AssetImage } from "@/components/AssetImage";

interface Room {
    _id: Id<"rooms">;
    name: string;
    isActive: boolean;
    items: unknown[];
    template?: {
        backgroundUrl: string;
    } | null;
}

interface RoomsPanelProps {
    myRooms: Room[] | undefined;
    switchingRoom: Id<"rooms"> | null;
    onSwitchRoom: (roomId: Id<"rooms">) => Promise<void>;
}

export function RoomsPanel({
    myRooms,
    switchingRoom,
    onSwitchRoom,
}: RoomsPanelProps) {
    const baseContainerClass = "bg-stone-50 w-full h-full overflow-hidden flex flex-col";

    const isSingleRoom = (myRooms?.length ?? 0) === 1;

    const container = (
        <div className={baseContainerClass}>
            <div className="p-3 space-y-2 overflow-y-auto flex-1">
                {!myRooms ? (
                    <div className="text-center py-4 text-stone-500">Loading rooms...</div>
                ) : myRooms.length === 0 ? (
                    <div className="text-center py-4 text-stone-500">
                        <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>No rooms yet!</p>
                        <p className="text-xs mt-1">Visit the shop to buy new rooms.</p>
                    </div>
                ) : (
                    myRooms.map((room) => {
                        const isActive = room.isActive || isSingleRoom;
                        const isSwitching = switchingRoom === room._id;

                        return (
                            <button
                                key={room._id}
                                onClick={() => !isActive && !isSingleRoom && onSwitchRoom(room._id)}
                                disabled={isActive || isSwitching}
                                className={`w-full flex items-center gap-3 p-2 rounded-lg border-2 transition-all text-left ${
                                    isActive
                                        ? "bg-emerald-50 border-emerald-400 cursor-default"
                                        : isSwitching
                                        ? "bg-stone-100 border-stone-300 cursor-wait opacity-70"
                                        : "bg-white border-stone-200 hover:border-emerald-300 hover:bg-emerald-50/50 cursor-pointer"
                                }`}
                            >
                                <div className="w-16 h-10 rounded overflow-hidden bg-stone-200 shrink-0">
                                    {room.template?.backgroundUrl && (
                                        <AssetImage
                                            assetUrl={room.template.backgroundUrl}
                                            alt={room.name}
                                            className="w-full h-full object-cover"
                                        />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-stone-700 truncate text-size-lg">
                                        {room.name}
                                    </div>
                                    <div className="text-xs text-stone-500">
                                        {room.items.length} item{room.items.length !== 1 ? 's' : ''}
                                    </div>
                                </div>

                                {isActive && (
                                    <div className="flex items-center gap-1 text-emerald-600 shrink-0">
                                        <CheckCircle2 className="h-5 w-5" />
                                        <span className="text-xs font-bold">Active</span>
                                    </div>
                                )}
                                {isSwitching && (
                                    <div className="text-stone-400 text-xs shrink-0">
                                        Switching...
                                    </div>
                                )}
                            </button>
                        );
                    })
                )}
            </div>

            <div className="bg-stone-200 border-t border-stone-300 px-3 py-2 text-size-md text-stone-500 text-center shrink-0">
                Buy more rooms from the Item Shop!
            </div>
        </div>
    );

    return <div className="w-full h-full">{container}</div>;
}

