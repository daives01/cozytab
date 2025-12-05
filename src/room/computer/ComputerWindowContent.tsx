import type { ComponentProps } from "react";
import { InvitePanel } from "./InvitePanel";
import { RoomsPanel } from "./RoomsPanel";
import { Shop } from "../Shop";
import { AboutPanel } from "./AboutPanel";
import { DisplayNamePanel } from "./DisplayNamePanel";
import type { ComputerWindowApp } from "./computerTypes";
import type { Doc, Id } from "../../../convex/_generated/dataModel";

type ShopWindowProps = ComponentProps<typeof Shop>;

interface RoomsWindowProps {
    myRooms: Doc<"rooms">[];
    switchingRoom: Id<"rooms"> | null;
    onSwitchRoom: (roomId: Id<"rooms">) => Promise<void>;
}

interface InviteWindowProps {
    referralUrl: string | null;
    copied: boolean;
    onCopyReferral: () => void;
    isGuest: boolean;
}

interface ComputerWindowContentProps {
    app: ComputerWindowApp;
    shopProps: ShopWindowProps;
    roomsProps?: RoomsWindowProps;
    inviteProps?: InviteWindowProps;
    profileProps?: {
        currentDisplayName: string;
        usernameFallback?: string;
        isSaving: boolean;
        error?: string | null;
        onSave: (next: string) => void;
    };
}

export function ComputerWindowContent({ app, shopProps, roomsProps, inviteProps, profileProps }: ComputerWindowContentProps) {
    if (app === "shop") {
        return <Shop {...shopProps} />;
    }

    if (app === "rooms" && roomsProps) {
        return (
            <RoomsPanel
                myRooms={roomsProps.myRooms}
                switchingRoom={roomsProps.switchingRoom}
                onSwitchRoom={roomsProps.onSwitchRoom}
            />
        );
    }

    if (app === "invite" && inviteProps) {
        return (
            <InvitePanel
                referralUrl={inviteProps.referralUrl}
                copied={inviteProps.copied}
                onCopyReferral={inviteProps.onCopyReferral}
                isGuest={inviteProps.isGuest}
            />
        );
    }

    if (app === "profile" && profileProps) {
        return (
            <DisplayNamePanel
                currentDisplayName={profileProps.currentDisplayName}
                usernameFallback={profileProps.usernameFallback}
                isSaving={profileProps.isSaving}
                error={profileProps.error}
                onSave={profileProps.onSave}
            />
        );
    }

    return <AboutPanel />;
}
