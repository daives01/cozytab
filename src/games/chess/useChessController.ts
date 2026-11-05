import { useCallback, useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { STARTING_FEN } from "../constants";

export type ChessSide = "white" | "black";

export type ChessGameSignal = "resign" | "drawOffer" | "drawAccept" | "drawDecline" | null;

export function loadChess(fen: string) {
    const chess = new Chess();

    try {
        chess.load(fen);
    } catch {
        chess.load(STARTING_FEN);
    }

    return chess;
}

export function isSideToMove(chess: Chess, side: ChessSide | null) {
    return side !== null && ((chess.turn() === "w" && side === "white") || (chess.turn() === "b" && side === "black"));
}

export function deriveChessStatus(chess: Chess): string | null {
    if (chess.isCheckmate()) return `Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins!`;

    if (chess.isStalemate()) return "Stalemate!";

    if (chess.isDraw()) return "Draw!";

    if (chess.isCheck()) return "Check!";

    return null;
}

export function needsPawnPromotion(chess: Chess, from: Square, to: Square, side: ChessSide | null) {
    const piece = chess.get(from);

    return piece?.type === "p" && ((side === "white" && to[1] === "8") || (side === "black" && to[1] === "1"));
}

export function selectClaimedSide(claimants: Array<{ visitorId: string; side?: ChessSide | null }>, side: ChessSide) {
    return claimants.flatMap((claimant) => (claimant.side === side ? [claimant.visitorId] : [])).sort()[0] ?? null;
}

export function deriveChessGameEnd(
    chess: Chess,
    fen: string,
    signals: Array<{ visitorId: string; side: ChessSide; signal: ChessGameSignal }>,
) {
    const resigned = signals.find((player) => player.signal === "resign");

    if (resigned)
        return {
            key: `resign:${resigned.visitorId}`,
            message: `${resigned.side === "white" ? "Black" : "White"} wins by resignation!`,
        };

    if (signals.some((player) => player.signal === "drawAccept")) return { key: "draw", message: "Draw agreed!" };

    if (chess.isCheckmate())
        return { key: `checkmate:${fen}`, message: `Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins!` };

    if (chess.isStalemate()) return { key: `stalemate:${fen}`, message: "Stalemate!" };

    if (chess.isDraw()) return { key: `draw:${fen}`, message: "Draw!" };

    return null;
}

export function useChessController({
    fen,
    lastMove,
    mySide,
    resultOverlay,
    onMove,
}: {
    fen: string;
    lastMove?: { from: string; to: string };
    mySide: ChessSide | null;
    resultOverlay: string | null;
    onMove: (move: { from: string; to: string; promotion?: string }, newFen: string) => void;
}) {
    const chess = useMemo(() => loadChess(fen), [fen]);
    const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [possibleMoves, setPossibleMoves] = useState<Set<Square>>(new Set());
    const isMyTurn = useMemo(() => isSideToMove(chess, mySide), [chess, mySide]);
    const gameStatus = useMemo(() => deriveChessStatus(chess), [chess]);

    const clearSelection = useCallback(() => {
        setSelectedSquare(null);
        setPossibleMoves(new Set());
    }, []);

    useEffect(() => {
        if (fen !== STARTING_FEN) return;
        /* eslint-disable react-hooks/set-state-in-effect -- reset selection when the shared game restarts */
        setPendingPromotion(null);
        clearSelection();
        /* eslint-enable react-hooks/set-state-in-effect */
    }, [clearSelection, fen]);

    const tryMove = useCallback(
        (from: Square, to: Square, promotion?: string) => {
            try {
                const next = loadChess(fen);

                if (!next.move({ from, to, promotion })) return false;
                onMove({ from, to, promotion }, next.fen());
                clearSelection();

                return true;
            } catch {
                return false;
            }
        },
        [clearSelection, fen, onMove],
    );

    const handleDrop = useCallback(
        ({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }) => {
            if (!targetSquare || !mySide || !isMyTurn || resultOverlay) return false;
            const from = sourceSquare as Square;
            const to = targetSquare as Square;

            if (needsPawnPromotion(chess, from, to, mySide)) {
                setPendingPromotion({ from, to });

                return false;
            }

            return tryMove(from, to);
        },
        [chess, isMyTurn, mySide, resultOverlay, tryMove],
    );

    const handleSquareClick = useCallback(
        ({ square }: { piece: unknown; square: string }) => {
            if (!mySide || !isMyTurn || resultOverlay) return;
            const target = square as Square;

            if (selectedSquare) {
                if (possibleMoves.has(target)) {
                    if (needsPawnPromotion(chess, selectedSquare, target, mySide))
                        setPendingPromotion({ from: selectedSquare, to: target });
                    else tryMove(selectedSquare, target);

                    return;
                }

                clearSelection();
            }

            const piece = chess.get(target);

            if (piece?.color === (mySide === "white" ? "w" : "b")) {
                setSelectedSquare(target);
                setPossibleMoves(
                    new Set(chess.moves({ square: target, verbose: true }).map((move) => move.to as Square)),
                );
            }
        },
        [chess, clearSelection, isMyTurn, mySide, possibleMoves, resultOverlay, selectedSquare, tryMove],
    );

    const handlePromotion = useCallback(
        (piece: "q" | "r" | "b" | "n") => {
            if (!pendingPromotion) return;
            tryMove(pendingPromotion.from, pendingPromotion.to, piece);
            setPendingPromotion(null);
        },
        [pendingPromotion, tryMove],
    );

    const squareStyles = useMemo(() => {
        const styles: Record<string, React.CSSProperties> = {};

        if (lastMove) {
            styles[lastMove.from] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
            styles[lastMove.to] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
        }

        if (selectedSquare) styles[selectedSquare] = { backgroundColor: "rgba(100, 200, 255, 0.6)" };

        for (const square of possibleMoves)
            styles[square] = {
                ...styles[square],
                background: chess.get(square)
                    ? "radial-gradient(circle, transparent 60%, rgba(0,0,0,0.3) 60%)"
                    : "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)",
            };

        return styles;
    }, [chess, lastMove, possibleMoves, selectedSquare]);

    return {
        chess,
        isMyTurn,
        gameStatus,
        pendingPromotion,
        handleDrop,
        handleSquareClick,
        handlePromotion,
        squareStyles,
    };
}
