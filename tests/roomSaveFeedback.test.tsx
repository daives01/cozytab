import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { RoomSaveFeedback } from "@/room/components/RoomSaveFeedback";
import { RoomsPanel } from "@/computer/RoomsPanel";
import type { Id } from "@convex/_generated/dataModel";

const retry = async () => {};

describe("room save feedback", () => {
    test("announces saving and saved states and disables retry during saving", () => {
        const saving = renderToStaticMarkup(<RoomSaveFeedback saveStatus="saving" onRetrySave={retry} />);
        expect(saving).toContain('role="status"');
        expect(saving).toContain('aria-live="polite"');
        expect(saving).toContain("Saving room…");
        expect(saving).toContain('disabled=""');
        const saved = renderToStaticMarkup(<RoomSaveFeedback saveStatus="clean" onRetrySave={retry} />);
        expect(saved).toContain("Room saved.");
        expect(saved).not.toContain("<button");
    });

    test("shows the failure reason and explicit retry beside blocked room switches", () => {
        const html = renderToStaticMarkup(<RoomsPanel
            myRooms={[{ _id: "room-1" as Id<"rooms">, name: "First", isActive: true, items: [] },
                { _id: "room-2" as Id<"rooms">, name: "Second", isActive: false, items: [] }]}
            switchingRoom={null} canSwitchRooms={false} saveStatus="error"
            saveError="Reconnect & try again" onRetrySave={retry} onSwitchRoom={async () => {}}
        />);
        expect(html).toContain("Couldn’t save your room.");
        expect(html).toContain("Reconnect &amp; try again");
        expect(html).toContain('aria-label="Retry saving room"');
        expect(html.match(/disabled=""/g)).toHaveLength(2);
        expect(html).toContain("Your room must be saved before switching.");
    });
});
