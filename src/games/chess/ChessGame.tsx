import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { STARTING_FEN } from "../constants";
import type { VisitorState } from "@/hooks/useWebSocketPresence";
import { CursorDisplay } from "@/presence/CursorDisplay";
import { Crown, X, Users, LogOut, Flag, Handshake } from "lucide-react";
import { useChessSounds } from "./useChessSounds";

export type GamePlayer = {
  visitorId: string;
  displayName: string;
  cursorColor?: string;
  side?: "white" | "black" | null;
};

export type GameSignal = "resign" | "drawOffer" | "drawAccept" | "drawDecline" | null;

interface ChessGameProps {
  playersInGame: VisitorState[];
  fen: string;
  lastMove?: { from: string; to: string };
  visitorId: string;
  mySide: "white" | "black" | null;
  visitors: VisitorState[];
  resultOverlay: string | null;
  onMove: (move: { from: string; to: string; promotion?: string }, newFen: string) => void;
  onClaimSide: (side: "white" | "black") => void;
  onLeaveSide: () => void;
  onSignal: (signal: GameSignal) => void;
  onGameEnd: (message: string) => void;
  onCursorMove: (x: number, y: number) => void;
  onClose: () => void;
}

function PlayerBadge({
  side,
  player,
  isMe,
  canJoin,
  onJoin,
  onLeave,
}: {
  side: "white" | "black";
  player: GamePlayer | undefined;
  isMe: boolean;
  canJoin: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const colors = side === "black"
    ? "bg-gray-800 text-white"
    : "bg-gray-100 text-gray-900";

  const baseClasses = `flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[var(--color-foreground)] shadow-[var(--shadow-2)] ${colors}`;

  if (player) {
    return (
      <div className={baseClasses}>
        <Crown className="w-4 h-4 shrink-0" />
        <span className="text-sm font-medium truncate max-w-[100px]">{player.displayName}</span>
        {isMe && (
          <button
            type="button"
            onClick={onLeave}
            className={`p-1 rounded-md -mr-1 transition-colors ${side === "black" ? "hover:bg-white/20" : "hover:bg-black/10"}`}
            title="Leave side"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onJoin}
      disabled={!canJoin}
      className={`${baseClasses} ${!canJoin ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:scale-105 transition-transform"}`}
    >
      <Crown className="w-4 h-4 shrink-0" />
      <span className={`text-sm font-medium ${side === "black" ? "text-gray-400" : "text-gray-500"}`}>Join</span>
    </button>
  );
}

export function ChessGame({
  playersInGame,
  fen: serverFen,
  lastMove: serverLastMove,
  visitorId,
  mySide,
  visitors,
  resultOverlay,
  onMove,
  onClaimSide,
  onLeaveSide,
  onSignal,
  onGameEnd,
  onCursorMove,
  onClose,
}: ChessGameProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const handledResultRef = useRef<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Square[]>([]);
  const { playMoveSound } = useChessSounds();
  const prevFenRef = useRef(serverFen);

  const [pendingOptimistic, setPendingOptimistic] = useState<{ fen: string; lastMove: { from: string; to: string } } | null>(null);

  const optimistic = pendingOptimistic && pendingOptimistic.fen !== serverFen ? pendingOptimistic : null;
  const fen = optimistic?.fen ?? serverFen;
  const lastMove = optimistic?.lastMove ?? serverLastMove;

  const chess = useMemo(() => {
    const c = new Chess();
    try {
      c.load(fen);
    } catch {
      c.load(STARTING_FEN);
    }
    return c;
  }, [fen]);

  useEffect(() => {
    if (prevFenRef.current !== fen && lastMove) {
      const prevChess = new Chess();
      try {
        prevChess.load(prevFenRef.current);
        const capturedPiece = prevChess.get(lastMove.to as Square);
        const movingPiece = prevChess.get(lastMove.from as Square);
        const isEnPassant = movingPiece?.type === "p" && lastMove.from[0] !== lastMove.to[0] && !capturedPiece;
        playMoveSound(!!capturedPiece || isEnPassant);
      } catch {
        playMoveSound(false);
      }
    }
    prevFenRef.current = fen;
  }, [fen, lastMove, playMoveSound]);

  const boardOrientation = mySide === "black" ? "black" : "white";

  const isMyTurn = useMemo(() => {
    if (!mySide) return false;
    const turn = chess.turn();
    return (turn === "w" && mySide === "white") || (turn === "b" && mySide === "black");
  }, [chess, mySide]);

  const gameStatus = useMemo(() => {
    if (chess.isCheckmate()) return `Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins!`;
    if (chess.isStalemate()) return "Stalemate!";
    if (chess.isDraw()) return "Draw!";
    if (chess.isCheck()) return "Check!";
    return null;
  }, [chess]);

  // Extract signals from players: { visitorId, side, signal }
  const playerSignals = useMemo(() => {
    return playersInGame
      .filter((p) => p.gameMetadata?.side && p.gameMetadata?.gameSignal)
      .map((p) => ({
        visitorId: p.visitorId,
        side: p.gameMetadata?.side as "white" | "black",
        signal: p.gameMetadata?.gameSignal as GameSignal,
      }));
  }, [playersInGame]);

  // Check for resign (anyone with "resign" signal)
  const resignedPlayer = playerSignals.find((p) => p.signal === "resign");

  // Check for draw offer from opponent (hide if we've declined)
  const mySignal = playerSignals.find((p) => p.visitorId === visitorId)?.signal;
  const opponentDrawOffer = playerSignals.find(
    (p) => p.signal === "drawOffer" && p.side !== mySide && mySignal !== "drawDecline"
  );

  // Check for mutual draw accept
  const drawAccepted = playerSignals.some((p) => p.signal === "drawAccept");

  // Derive result key to detect unique game-ending events
  const resultKey = resignedPlayer
    ? `resign:${resignedPlayer.visitorId}`
    : drawAccepted
      ? "draw"
      : null;

  // Notify parent of game-ending signals (resign or draw accept)
  useEffect(() => {
    if (!resultKey || handledResultRef.current === resultKey) return;
    handledResultRef.current = resultKey;

    const message = resignedPlayer
      ? `${resignedPlayer.side === "white" ? "Black" : "White"} wins by resignation!`
      : "Draw agreed!";

    onGameEnd(message);
  }, [resultKey, resignedPlayer, onGameEnd]);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setPossibleMoves([]);
  }, []);

  const tryMove = useCallback(
    (from: Square, to: Square, promotion?: string) => {
      try {
        const move = chess.move({ from, to, promotion });
        if (move) {
          const newFen = chess.fen();
          setPendingOptimistic({ fen: newFen, lastMove: { from, to } });
          onMove({ from, to, promotion }, newFen);
          clearSelection();
          return true;
        }
      } catch {
        // Invalid move
      }
      return false;
    },
    [chess, onMove, clearSelection]
  );

  const needsPromotion = useCallback(
    (from: Square, to: Square) => {
      const piece = chess.get(from);
      if (piece?.type !== "p") return false;
      const targetRank = to[1];
      return (mySide === "white" && targetRank === "8") || (mySide === "black" && targetRank === "1");
    },
    [chess, mySide]
  );

  const handleDrop = useCallback(
    ({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }): boolean => {
      if (!targetSquare || !mySide || !isMyTurn) return false;
      const from = sourceSquare as Square;
      const to = targetSquare as Square;

      if (needsPromotion(from, to)) {
        setPendingPromotion({ from, to });
        return false;
      }

      return tryMove(from, to);
    },
    [mySide, isMyTurn, needsPromotion, tryMove]
  );

  const handleSquareClick = useCallback(
    ({ square }: { piece: unknown; square: string }) => {
      if (!mySide || !isMyTurn) return;
      const sq = square as Square;

      if (selectedSquare) {
        if (possibleMoves.includes(sq)) {
          if (needsPromotion(selectedSquare, sq)) {
            setPendingPromotion({ from: selectedSquare, to: sq });
            return;
          }
          tryMove(selectedSquare, sq);
          return;
        }
        clearSelection();
      }

      const piece = chess.get(sq);
      const myColor = mySide === "white" ? "w" : "b";
      if (piece?.color === myColor) {
        setSelectedSquare(sq);
        setPossibleMoves(chess.moves({ square: sq, verbose: true }).map((m) => m.to as Square));
      }
    },
    [chess, mySide, isMyTurn, selectedSquare, possibleMoves, needsPromotion, tryMove, clearSelection]
  );

  const handlePromotion = useCallback(
    (piece: "q" | "r" | "b" | "n") => {
      if (!pendingPromotion) return;
      tryMove(pendingPromotion.from, pendingPromotion.to, piece);
      setPendingPromotion(null);
    },
    [pendingPromotion, tryMove]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      onCursorMove(x, y);
    },
    [onCursorMove]
  );

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
      styles[lastMove.to] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
    }

    if (selectedSquare) {
      styles[selectedSquare] = { backgroundColor: "rgba(100, 200, 255, 0.6)" };
    }

    for (const sq of possibleMoves) {
      const hasPiece = chess.get(sq as Square);
      styles[sq] = {
        ...styles[sq],
        background: hasPiece
          ? "radial-gradient(circle, transparent 60%, rgba(0,0,0,0.3) 60%)"
          : "radial-gradient(circle, rgba(0,0,0,0.2) 25%, transparent 25%)",
      };
    }

    return styles;
  }, [lastMove, selectedSquare, possibleMoves, chess]);

  const getCursorOwnerSide = useCallback(
    (cursorVisitorId: string): "white" | "black" | null => {
      const player = playersInGame.find((p) => p.visitorId === cursorVisitorId);
      const side = player?.gameMetadata?.side;
      if (side === "white" || side === "black") return side;
      return null;
    },
    [playersInGame]
  );

  const otherCursors = useMemo(() => {
    return playersInGame
      .filter((p) => p.visitorId !== visitorId)
      .map((player) => {
        const rawX = player.gameMetadata?.gameCursorX;
        const rawY = player.gameMetadata?.gameCursorY;
        const gameCursorX = typeof rawX === "number" && Number.isFinite(rawX) ? rawX : 50;
        const gameCursorY = typeof rawY === "number" && Number.isFinite(rawY) ? rawY : 50;
        const ownerSide = getCursorOwnerSide(player.visitorId);
        const ownerViewsAsBlack = ownerSide === "black";
        const iViewAsBlack = mySide === "black";
        const needsFlip = ownerViewsAsBlack !== iViewAsBlack;

        return {
          visitorId: player.visitorId,
          x: gameCursorX,
          y: gameCursorY,
          cursorColor: player.cursorColor,
          displayX: needsFlip ? 100 - gameCursorX : gameCursorX,
          displayY: needsFlip ? 100 - gameCursorY : gameCursorY,
          needsFlip,
        };
      });
  }, [playersInGame, visitorId, mySide, getCursorOwnerSide]);

  // Derive white/black players from gameMetadata with deterministic tie-break (smallest visitorId wins)
  const whitePlayerId = useMemo(() => {
    const claimants = playersInGame
      .filter((p) => p.gameMetadata?.side === "white")
      .map((p) => p.visitorId)
      .sort();
    return claimants[0] ?? null;
  }, [playersInGame]);

  const blackPlayerId = useMemo(() => {
    const claimants = playersInGame
      .filter((p) => p.gameMetadata?.side === "black")
      .map((p) => p.visitorId)
      .sort();
    return claimants[0] ?? null;
  }, [playersInGame]);

  const whitePlayer: GamePlayer | undefined = useMemo(() => {
    const p = playersInGame.find((p) => p.visitorId === whitePlayerId);
    return p ? { visitorId: p.visitorId, displayName: p.displayName, cursorColor: p.cursorColor, side: "white" } : undefined;
  }, [playersInGame, whitePlayerId]);

  const blackPlayer: GamePlayer | undefined = useMemo(() => {
    const p = playersInGame.find((p) => p.visitorId === blackPlayerId);
    return p ? { visitorId: p.visitorId, displayName: p.displayName, cursorColor: p.cursorColor, side: "black" } : undefined;
  }, [playersInGame, blackPlayerId]);

  const spectators = useMemo(
    () => playersInGame.filter((p) => p.visitorId !== whitePlayerId && p.visitorId !== blackPlayerId),
    [playersInGame, whitePlayerId, blackPlayerId]
  );

  // Can join a side if: (1) it's empty, and (2) either I have no side OR I'm alone (can switch)
  const otherPlayerExists = (whitePlayerId && whitePlayerId !== visitorId) || (blackPlayerId && blackPlayerId !== visitorId);
  const canJoinWhite = !whitePlayer && (!mySide || !otherPlayerExists);
  const canJoinBlack = !blackPlayer && (!mySide || !otherPlayerExists);

  const getPlayerChat = useCallback((playerId: string): string | null | undefined => {
    const visitor = visitors.find((v) => v.visitorId === playerId);
    return visitor?.chatMessage;
  }, [visitors]);

  const topBadgeSide = boardOrientation === "white" ? "black" : "white";
  const bottomBadgeSide = boardOrientation === "white" ? "white" : "black";
  const topPlayer = topBadgeSide === "white" ? whitePlayer : blackPlayer;
  const bottomPlayer = bottomBadgeSide === "white" ? whitePlayer : blackPlayer;
  const canJoinTop = topBadgeSide === "white" ? canJoinWhite : canJoinBlack;
  const canJoinBottom = bottomBadgeSide === "white" ? canJoinWhite : canJoinBlack;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      {/* Top controls */}
      <div className="flex items-center justify-between w-full">
        <PlayerBadge
          side={topBadgeSide}
          player={topPlayer}
          isMe={mySide === topBadgeSide}
          canJoin={canJoinTop}
          onJoin={() => onClaimSide(topBadgeSide)}
          onLeave={onLeaveSide}
        />
        <div className="flex items-center gap-2">
          {spectators.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-black/20 text-white/70 text-xs">
              <Users className="w-3 h-3" />
              <span>{spectators.length}</span>
            </div>
          )}
          {mySide && (
            <>
              <button
                type="button"
                onClick={() => onSignal("resign")}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 border-[var(--color-foreground)] bg-[var(--color-background)] hover:bg-red-100 text-xs font-medium transition-colors"
                title="Resign"
              >
                <Flag className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onSignal("drawOffer")}
                disabled={!!opponentDrawOffer}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 border-[var(--color-foreground)] bg-[var(--color-background)] hover:bg-amber-100 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Offer draw"
              >
                <Handshake className="w-3 h-3" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] transition-colors shadow-[var(--shadow-2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="relative aspect-square w-[min(85vw,85vh,500px)]"
        onMouseMove={handleMouseMove}
      >
        {/* Board wrapper with clipping for rounded corners */}
        <div className="absolute inset-0 rounded-xl overflow-hidden border-4 border-[var(--color-foreground)] shadow-[var(--shadow-8)]">
          <Chessboard
            options={{
              position: fen,
              onPieceDrop: handleDrop,
              onSquareClick: handleSquareClick,
              boardOrientation,
              squareStyles,
              allowDragging: !!mySide && isMyTurn,
              boardStyle: { borderRadius: "0" },
              darkSquareStyle: { backgroundColor: "#b58863" },
              lightSquareStyle: { backgroundColor: "#f0d9b5" },
            } satisfies ChessboardOptions}
          />
        </div>
        {/* Cursor layer outside clipping container so chat bubbles can overflow */}
        {otherCursors.map((cursor) => (
          <div
            key={cursor.visitorId}
            className="absolute pointer-events-none transition-all duration-75"
            style={{ left: `${cursor.displayX}%`, top: `${cursor.displayY}%`, transform: "translate(-50%, -50%)", zIndex: 10 }}
          >
            <CursorDisplay x={0} y={0} cursorColor={cursor.cursorColor} chatMessage={getPlayerChat(cursor.visitorId)} hidePointer={false} scale={1} rotated={cursor.needsFlip} />
          </div>
        ))}
      </div>

      {/* Bottom controls */}
      <div className="flex items-center justify-between w-full">
        <PlayerBadge
          side={bottomBadgeSide}
          player={bottomPlayer}
          isMe={mySide === bottomBadgeSide}
          canJoin={canJoinBottom}
          onJoin={() => onClaimSide(bottomBadgeSide)}
          onLeave={onLeaveSide}
        />
        {/* Status - fixed height to prevent layout shift */}
        <div className="h-10 flex items-center justify-center">
          {gameStatus ? (
            <div className="px-3 py-1.5 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] text-[var(--color-foreground)] text-sm font-bold shadow-[var(--shadow-2)]">
              {gameStatus}
            </div>
          ) : mySide ? (
            <div
              className={`px-4 py-2 rounded-xl border-2 border-[var(--color-foreground)] font-medium shadow-[var(--shadow-2)] transition-colors ${
                isMyTurn ? "bg-green-500 text-white" : "bg-[var(--color-muted)] text-[var(--color-foreground)]"
              }`}
            >
              {isMyTurn ? "Your turn!" : "Waiting..."}
            </div>
          ) : null}
        </div>
      </div>

      {/* Promotion modal */}
      {pendingPromotion && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-background)] rounded-2xl border-2 border-[var(--color-foreground)] shadow-[var(--shadow-8)] p-4">
            <p className="text-center font-bold mb-3">Promote to:</p>
            <div className="flex gap-2">
              {(["q", "r", "b", "n"] as const).map((piece) => (
                <button
                  key={piece}
                  type="button"
                  onClick={() => handlePromotion(piece)}
                  className="w-12 h-12 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-muted)] hover:bg-[var(--color-accent)] flex items-center justify-center text-2xl font-bold shadow-[var(--shadow-2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
                >
                  {piece === "q" ? "♕" : piece === "r" ? "♖" : piece === "b" ? "♗" : "♘"}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Draw offer prompt */}
      {opponentDrawOffer && mySide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[var(--color-background)] rounded-2xl border-2 border-[var(--color-foreground)] shadow-[var(--shadow-8)] p-4">
            <p className="text-center font-bold mb-3">Opponent offers a draw</p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => onSignal("drawAccept")}
                className="px-4 py-2 rounded-xl border-2 border-[var(--color-foreground)] bg-green-500 text-white font-medium shadow-[var(--shadow-2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => onSignal("drawDecline")}
                className="px-4 py-2 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-muted)] font-medium shadow-[var(--shadow-2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Result overlay */}
      {resultOverlay && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-[var(--color-background)] rounded-2xl border-2 border-[var(--color-foreground)] shadow-[var(--shadow-8)] px-8 py-6 animate-in fade-in zoom-in duration-200">
            <p className="text-xl font-bold text-center">{resultOverlay}</p>
          </div>
        </div>
      )}
    </div>
  );
}
