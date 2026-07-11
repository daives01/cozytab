import { describe, expect, test } from "bun:test";
import type { Id } from "../convex/_generated/dataModel";
import { normalizeFriendRoomSource, normalizeInviteRoomSource } from "../src/room/visitorRoomSource";
import { clampWindowToBounds, type ComputerWindow } from "../src/computer/useWindowManager";
import { applyPresenceMessage } from "../src/presence/presenceState";
import { deriveChessGameEnd, deriveChessStatus, isSideToMove, loadChess, needsPawnPromotion, selectClaimedSide } from "../src/games/chess/useChessController";

const room = {
    _id: "room-1" as Id<"rooms">,
    items: [],
    template: { backgroundUrl: "/room.png" },
};

describe("visitor room source normalization", () => {
    test("keeps invite closure and referral capabilities explicit", () => {
        const source = normalizeInviteRoomSource({ room, ownerName: "Host", ownerReferralCode: "ABC", closed: true });
        expect(source).toMatchObject({ kind: "invite", access: "closed", ownerName: "Host", ownerReferralCode: "ABC" });
    });

    test("friend access remains open independently of invite TTL", () => {
        expect(normalizeFriendRoomSource({ room, ownerName: "Friend" })).toMatchObject({ kind: "friend", access: "open" });
    });
});

describe("window manager core", () => {
    test("clamps position, minimum size, and desktop overflow", () => {
        const window: ComputerWindow = { id: "1", app: "about", title: "About", x: 900, y: -10, width: 100, height: 900, z: 1 };
        expect(clampWindowToBounds(window, { width: 800, height: 600 })).toMatchObject({ x: 440, y: 0, width: 360, height: 600 });
    });
});

describe("presence transitions", () => {
    const visitor = { visitorId: "a", displayName: "A", isOwner: false, x: 10, y: 20, chatMessage: null, inMenu: false, tabbedOut: false };

    test("filters cursor coordinates across menu contexts but updates metadata", () => {
        const [next] = applyPresenceMessage([visitor], { type: "cursor", visitorId: "a", x: 100, y: 200, inMenu: true, cursorColor: "red" }, { inMenu: false, inGame: null });
        expect(next).toMatchObject({ x: 10, y: 20, inMenu: true, cursorColor: "red" });
    });

    test("applies coordinates for visitors in the same game", () => {
        const [next] = applyPresenceMessage([{ ...visitor, inGame: "chess" }], { type: "cursor", visitorId: "a", x: 100, y: 200, inMenu: true, inGame: "chess" }, { inMenu: false, inGame: "chess" });
        expect(next).toMatchObject({ x: 100, y: 200 });
    });
});

describe("chess controller rules", () => {
    test("derives turns, terminal status, and promotion", () => {
        const start = loadChess("invalid");
        expect(isSideToMove(start, "white")).toBe(true);
        const mate = loadChess("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
        expect(deriveChessStatus(mate)).toBe("Checkmate! White wins!");
        const promotion = loadChess("7k/P7/8/8/8/8/8/7K w - - 0 1");
        expect(needsPawnPromotion(promotion, "a7", "a8", "white")).toBe(true);
    });

    test("uses a deterministic side-claim tie break", () => {
        expect(selectClaimedSide([{ visitorId: "z", side: "white" }, { visitorId: "a", side: "white" }], "white")).toBe("a");
    });

    test("derives draw and resign signaling outcomes", () => {
        const chess = loadChess("invalid");
        expect(deriveChessGameEnd(chess, chess.fen(), [{ visitorId: "w", side: "white", signal: "resign" }])?.message).toBe("Black wins by resignation!");
        expect(deriveChessGameEnd(chess, chess.fen(), [{ visitorId: "b", side: "black", signal: "drawAccept" }])?.message).toBe("Draw agreed!");
    });
});
