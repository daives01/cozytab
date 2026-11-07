import { expect, test } from "bun:test";
import { act, create } from "react-test-renderer";
import { Chess } from "chess.js";
import { STARTING_FEN } from "../src/games/constants";
import { transitionChessSession } from "../src/games/chess/useChessSession";
import { useChessController, type ChessSide } from "../src/games/chess/useChessController";

const initial = { opponent: null, result: null };
const snapshot = { fen: STARTING_FEN, gameEnd: null, mySide: "white" as const, mySignal: null, opponentSignal: null };

test("draw decline handshake waits for acknowledgement and recovers a newly observed offer", () => {
    const offered = transitionChessSession(initial, { ...snapshot, mySignal: "drawOffer" });
    expect(offered.draw).toBe("offering");
    expect(
        transitionChessSession(offered.memory, { ...snapshot, mySignal: "drawOffer", opponentSignal: "drawDecline" })
            .draw,
    ).toBe("declined");
    const incoming = transitionChessSession(initial, { ...snapshot, opponentSignal: "drawOffer" });
    expect(incoming.draw).toBe("incoming");
    const declined = { ...snapshot, mySignal: "drawDecline" as const, opponentSignal: "drawOffer" as const };
    expect(transitionChessSession(incoming.memory, declined).draw).toBe("idle");
    expect(transitionChessSession(incoming.memory, { ...declined, opponentSignal: null }).draw).toBe("acknowledge");
    expect(transitionChessSession(initial, declined).draw).toBe("acknowledge");
    expect(transitionChessSession(initial, { ...declined, mySide: null }).draw).toBe("idle");
});

test("results notify once, survive transient signal loss, and rearm on reset even at starting FEN", () => {
    const gameEnd = { key: "resign:opponent", message: "White wins by resignation!" };
    const ended = transitionChessSession(initial, { ...snapshot, gameEnd });
    expect(ended.notification).toBe(gameEnd.message);
    expect(transitionChessSession(ended.memory, { ...snapshot, gameEnd }).notification).toBeNull();
    const movedFen = new Chess();
    movedFen.move("e4");
    expect(transitionChessSession(ended.memory, { ...snapshot, fen: movedFen.fen() }).memory.result).toBe(gameEnd.key);
    const reset = transitionChessSession(ended.memory, snapshot);
    expect(reset.memory.result).toBeNull();
    expect(transitionChessSession(reset.memory, { ...snapshot, gameEnd }).notification).toBe(gameEnd.message);
});

test("selection and promotion belong to one position and side; stale promotion cannot move", async () => {
    let controller!: ReturnType<typeof useChessController>;
    const moves: string[] = [];
    const promoteFen = "7k/P7/8/8/8/8/8/7K w - - 0 1";
    function Harness({ fen, side, overlay = null }: { fen: string; side: ChessSide; overlay?: string | null }) {
        controller = useChessController({
            fen,
            mySide: side,
            resultOverlay: overlay,
            onMove: (_, next) => moves.push(next),
        });
        return null;
    }
    const renderer = await act(() => create(<Harness fen={promoteFen} side="white" />));
    await act(() => controller.handleSquareClick({ piece: null, square: "a7" }));
    await act(() => controller.handleSquareClick({ piece: null, square: "a8" }));
    expect(controller.pendingPromotion).not.toBeNull();
    await act(() => renderer.update(<Harness fen={promoteFen} side="black" />));
    expect(controller.pendingPromotion).toBeNull();
    await act(() => renderer.update(<Harness fen={promoteFen} side="white" />));
    expect(controller.pendingPromotion).toBeNull();
    await act(() => controller.handlePromotion("q"));
    expect(moves).toHaveLength(0);
    await act(() => controller.handleSquareClick({ piece: null, square: "a7" }));
    await act(() => controller.handleSquareClick({ piece: null, square: "a8" }));
    expect(controller.pendingPromotion).not.toBeNull();
    await act(() => renderer.update(<Harness fen={promoteFen} side="white" overlay="Game over" />));
    await act(() => renderer.update(<Harness fen={promoteFen} side="white" />));
    expect(controller.pendingPromotion).toBeNull();
    await act(() => renderer.update(<Harness fen={STARTING_FEN} side="white" />));
    await act(() => controller.handleSquareClick({ piece: null, square: "e2" }));
    const chess = new Chess();
    chess.move("d4");
    await act(() => renderer.update(<Harness fen={chess.fen()} side="white" />));
    expect(controller.squareStyles.e2).toBeUndefined();
    await act(() => renderer.unmount());
});
