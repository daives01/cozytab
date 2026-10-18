import type { ComponentProps } from "react";
import { RoomsPanel } from "./RoomsPanel";
import { Shop } from "@/shop/Shop";
import { AboutPanel } from "./AboutPanel";
import { CustomizePanel } from "./CustomizePanel";
import { FriendsPanel } from "./FriendsPanel";
import type { ComputerWindowApp } from "./types";
import type { Doc, Id } from "@convex/_generated/dataModel";
import type { VisitorState } from "@/hooks/useWebSocketPresence";
import type { RoomSaveStatus } from "@/room/session/types";

type ShopWindowProps = ComponentProps<typeof Shop>;

interface RoomsWindowProps {
    myRooms: Doc<"rooms">[];
    switchingRoom: Id<"rooms"> | null;
    canSwitchRooms: boolean;
    saveStatus?: RoomSaveStatus;
    saveError?: string | null;
    onRetrySave?: () => Promise<void>;
    onSwitchRoom: (roomId: Id<"rooms">) => Promise<void>;
}

interface ComputerWindowContentProps {
    app: ComputerWindowApp;
    shopProps: ShopWindowProps;
    roomsProps?: RoomsWindowProps;
    customizeProps?: {
        displayNameProps?: {
            currentDisplayName: string;
            usernameFallback?: string;
            isSaving: boolean;
            error?: string | null;
            onSave: (next: string) => void;
        };
        color: string;
        onColorChange: (next: string) => void;
        allowColorChange?: boolean;
    };
    isGuest?: boolean;
    inRoomVisitors?: VisitorState[];
}

export function ComputerWindowContent({ app, shopProps, roomsProps, customizeProps, isGuest, inRoomVisitors }: ComputerWindowContentProps) {
    if (app === "shop") {
        return <Shop {...shopProps} />;
    }

    if (app === "rooms" && roomsProps) {
        return (
            <RoomsPanel
                myRooms={roomsProps.myRooms}
                switchingRoom={roomsProps.switchingRoom}
                canSwitchRooms={roomsProps.canSwitchRooms}
                saveStatus={roomsProps.saveStatus}
                saveError={roomsProps.saveError}
                onRetrySave={roomsProps.onRetrySave}
                onSwitchRoom={roomsProps.onSwitchRoom}
            />
        );
    }

    if (app === "friends") {
        return (
            <FriendsPanel
                isGuest={isGuest}
                inRoomVisitors={inRoomVisitors}
            />
        );
    }

    if (app === "customize" && customizeProps) {
        return (
            <CustomizePanel
                displayNameProps={customizeProps.displayNameProps}
                color={customizeProps.color}
                onColorChange={customizeProps.onColorChange}
                allowColorChange={customizeProps.allowColorChange}
            />
        );
    }

    return <AboutPanel />;
}
