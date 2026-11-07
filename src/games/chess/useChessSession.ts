import { useEffect, useRef, useState } from "react";
import type { Chess } from "chess.js";
import { STARTING_FEN } from "../constants";
import { deriveChessGameEnd, type ChessGameSignal, type ChessSide } from "./useChessController";

type PlayerSignal = { visitorId: string; side: ChessSide; signal: ChessGameSignal };
type SessionMemory = { opponent: ChessGameSignal; result: string | null };
type DrawTransition = "idle" | "incoming" | "offering" | "declined" | "acknowledge";

// Presence remains the source of truth. Memory records only observed edges, never a second game state.
export function transitionChessSession(
    previous: SessionMemory,
    {
        fen,
        gameEnd,
        mySide,
        mySignal,
        opponentSignal,
    }: {
        fen: string;
        gameEnd: { key: string; message: string } | null;
        mySide: ChessSide | null;
        mySignal: ChessGameSignal;
        opponentSignal: ChessGameSignal;
    },
) {
    let draw: DrawTransition = "idle";

    if (mySide) {
        if (mySignal === "drawOffer") draw = opponentSignal === "drawDecline" ? "declined" : "offering";
        else if (mySignal === "drawDecline") {
            if (opponentSignal !== "drawOffer" || previous.opponent !== "drawOffer") draw = "acknowledge";
        } else if (opponentSignal === "drawOffer") draw = "incoming";
    }

    const result = gameEnd?.key ?? (fen === STARTING_FEN ? null : previous.result);

    return {
        memory: { opponent: opponentSignal, result },
        draw,
        notification: gameEnd && result !== previous.result ? gameEnd.message : null,
    };
}

export function useChessSession({
    fen,
    chess,
    playerSignals,
    visitorId,
    mySide,
    onSignal,
    onGameEnd,
}: {
    fen: string;
    chess: Chess;
    playerSignals: PlayerSignal[];
    visitorId: string;
    mySide: ChessSide | null;
    onSignal: (signal: ChessGameSignal) => void;
    onGameEnd: (message: string) => void;
}) {
    const memory = useRef<SessionMemory>({ opponent: null, result: null });
    const [declinedAt, setDeclinedAt] = useState<number | null>(null);
    const mySignal = playerSignals.find((player) => player.visitorId === visitorId)?.signal ?? null;
    const opponentSignal =
        playerSignals.find((player) => player.visitorId !== visitorId && player.side !== mySide)?.signal ?? null;
    const gameEnd = deriveChessGameEnd(chess, fen, playerSignals);

    useEffect(() => {
        const next = transitionChessSession(memory.current, { fen, gameEnd, mySide, mySignal, opponentSignal });
        memory.current = next.memory;
        if (next.draw === "declined" || next.draw === "acknowledge") onSignal(null);
        if (next.draw === "declined") queueMicrotask(() => setDeclinedAt(Date.now()));
        if (next.notification) onGameEnd(next.notification);
    }, [fen, gameEnd, mySide, mySignal, opponentSignal, onSignal, onGameEnd]);

    useEffect(() => {
        if (declinedAt === null) return;
        const timer = setTimeout(() => setDeclinedAt(null), 2000);

        return () => clearTimeout(timer);
    }, [declinedAt]);

    return {
        mySignal,
        opponentDrawOffer:
            transitionChessSession({ opponent: null, result: null }, { fen, gameEnd, mySide, mySignal, opponentSignal })
                .draw === "incoming",
        showDrawDeclined: declinedAt !== null,
    };
}
