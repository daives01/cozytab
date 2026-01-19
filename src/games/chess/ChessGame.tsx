import { useState, useCallback, useMemo, useRef } from "react";
import { Chessboard } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { STARTING_FEN } from "../constants";
import type { GameState, GamePlayer } from "../hooks/useGamePresence";
import { CursorDisplay } from "@/presence/CursorDisplay";
import { RotateCcw, Crown, X, Users } from "lucide-react";

interface ChessGameProps {
  gameState: GameState | null;
  visitorId: string;
  onMove: (move: { from: string; to: string; promotion?: string }, newFen: string) => void;
  onClaimSide: (side: "white" | "black") => void;
  onReset: () => void;
  onCursorMove: (x: number, y: number) => void;
  onClose: () => void;
}

function PlayerBadge({ side, player, onJoin, disabled }: { 
  side: "white" | "black"; 
  player: GamePlayer | undefined; 
  onJoin: () => void;
  disabled: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 border-[var(--color-foreground)] shadow-[var(--shadow-2)] ${
      side === "black" ? "bg-gray-800 text-white" : "bg-gray-100 text-gray-900"
    }`}>
      <Crown className="w-4 h-4 shrink-0" />
      <span className="text-sm font-medium truncate max-w-[100px]">
        {player?.displayName ?? (
          <button
            type="button"
            onClick={onJoin}
            disabled={disabled}
            className={`${side === "black" ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"} disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap`}
          >
            Join
          </button>
        )}
      </span>
    </div>
  );
}

export function ChessGame({
  gameState,
  visitorId,
  onMove,
  onClaimSide,
  onReset,
  onCursorMove,
  onClose,
}: ChessGameProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const fen = gameState?.fen ?? STARTING_FEN;
  const chess = useMemo(() => {
    const c = new Chess();
    try {
      c.load(fen);
    } catch {
      c.load(STARTING_FEN);
    }
    return c;
  }, [fen]);

  const mySide = useMemo(() => {
    if (!gameState) return null;
    if (gameState.whitePlayer === visitorId) return "white";
    if (gameState.blackPlayer === visitorId) return "black";
    return null;
  }, [gameState, visitorId]);

  const isMyTurn = useMemo(() => {
    if (!mySide) return false;
    const turn = chess.turn();
    return (turn === "w" && mySide === "white") || (turn === "b" && mySide === "black");
  }, [chess, mySide]);

  const gameStatus = useMemo(() => {
    if (chess.isCheckmate()) {
      const winner = chess.turn() === "w" ? "Black" : "White";
      return `Checkmate! ${winner} wins!`;
    }
    if (chess.isStalemate()) return "Stalemate!";
    if (chess.isDraw()) return "Draw!";
    if (chess.isCheck()) return "Check!";
    return null;
  }, [chess]);

  const handleDrop = useCallback(
    ({ sourceSquare, targetSquare }: { piece: unknown; sourceSquare: string; targetSquare: string | null }): boolean => {
      if (!targetSquare) return false;
      if (!mySide || !isMyTurn) return false;

      const piece = chess.get(sourceSquare as Square);
      if (piece?.type === "p") {
        const targetRank = targetSquare[1];
        if ((mySide === "white" && targetRank === "8") || (mySide === "black" && targetRank === "1")) {
          setPendingPromotion({ from: sourceSquare as Square, to: targetSquare as Square });
          return false;
        }
      }

      try {
        const move = chess.move({ from: sourceSquare, to: targetSquare });
        if (move) {
          onMove({ from: sourceSquare, to: targetSquare }, chess.fen());
          return true;
        }
      } catch {
        return false;
      }
      return false;
    },
    [chess, mySide, isMyTurn, onMove]
  );

  const handlePromotion = useCallback(
    (piece: "q" | "r" | "b" | "n") => {
      if (!pendingPromotion) return;
      try {
        const move = chess.move({
          from: pendingPromotion.from,
          to: pendingPromotion.to,
          promotion: piece,
        });
        if (move) {
          onMove(
            { from: pendingPromotion.from, to: pendingPromotion.to, promotion: piece },
            chess.fen()
          );
        }
      } catch {
        // invalid
      }
      setPendingPromotion(null);
    },
    [chess, pendingPromotion, onMove]
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

  const lastMove = gameState?.lastMove;
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMove) {
      styles[lastMove.from] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
      styles[lastMove.to] = { backgroundColor: "rgba(255, 255, 0, 0.4)" };
    }
    return styles;
  }, [lastMove]);

  const otherCursors = useMemo(() => {
    if (!gameState) return [];
    return Object.values(gameState.cursors).filter((c) => c.visitorId !== visitorId);
  }, [gameState, visitorId]);

  const players = gameState?.players ?? [];
  const whitePlayer = players.find((p) => p.visitorId === gameState?.whitePlayer);
  const blackPlayer = players.find((p) => p.visitorId === gameState?.blackPlayer);
  const spectators = players.filter((p) => p.side === null);
  const hasMySide = !!mySide;

  return (
    <div className="flex items-center justify-center gap-4 select-none">
      {/* Left side controls (landscape only) */}
      <div className="hidden landscape:flex flex-col gap-3 justify-center items-end">
        <PlayerBadge side="black" player={blackPlayer} onJoin={() => onClaimSide("black")} disabled={hasMySide} />
        {spectators.length > 0 && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/20 text-white/70 text-xs">
            <Users className="w-3 h-3" />
            <span>{spectators.length}</span>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3">
        {/* Portrait: top controls */}
        <div className="flex landscape:hidden items-center justify-between w-full">
          <PlayerBadge side="black" player={blackPlayer} onJoin={() => onClaimSide("black")} disabled={hasMySide} />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onReset}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 border-[var(--color-foreground)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] transition-colors shadow-[var(--shadow-2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-xs font-medium"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] transition-colors shadow-[var(--shadow-2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* The board - sized to fit viewport */}
        <div
          ref={boardRef}
          className="relative aspect-square rounded-xl overflow-hidden border-4 border-[var(--color-foreground)] shadow-[var(--shadow-8)] w-[min(85vw,85vh,500px)] landscape:w-[min(70vw,80vh,600px)]"
          onMouseMove={handleMouseMove}
        >
          <Chessboard
            options={{
              position: fen,
              onPieceDrop: handleDrop,
              boardOrientation: mySide === "black" ? "black" : "white",
              squareStyles: customSquareStyles,
              allowDragging: !!mySide && isMyTurn,
              boardStyle: {
                borderRadius: "0",
              },
              darkSquareStyle: { backgroundColor: "#b58863" },
              lightSquareStyle: { backgroundColor: "#f0d9b5" },
            } satisfies ChessboardOptions}
          />
          {otherCursors.map((cursor) => (
            <div
              key={cursor.visitorId}
              className="absolute pointer-events-none"
              style={{
                left: `${cursor.x}%`,
                top: `${cursor.y}%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <CursorDisplay
                x={0}
                y={0}
                cursorColor={cursor.cursorColor}
                hidePointer={false}
                scale={1}
              />
            </div>
          ))}
        </div>

        {/* Portrait: bottom controls */}
        <div className="flex landscape:hidden items-center justify-between w-full">
          <PlayerBadge side="white" player={whitePlayer} onJoin={() => onClaimSide("white")} disabled={hasMySide} />
          {spectators.length > 0 && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/20 text-white/70 text-xs">
              <Users className="w-3 h-3" />
              <span>{spectators.length}</span>
            </div>
          )}
        </div>

        {/* Status messages */}
        {(gameStatus || mySide) && (
          <div className="flex flex-col items-center gap-1 text-white text-center">
            {gameStatus && (
              <div className="px-3 py-1.5 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] text-[var(--color-foreground)] text-sm font-bold shadow-[var(--shadow-2)]">
                {gameStatus}
              </div>
            )}
            {mySide && !gameStatus && (
              <div className="text-sm font-medium text-white/80">
                Playing as <span className="font-bold">{mySide}</span>
                {isMyTurn ? " — Your turn!" : " — Waiting..."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side controls (landscape only) */}
      <div className="hidden landscape:flex flex-col gap-3 justify-center items-start">
        <PlayerBadge side="white" player={whitePlayer} onJoin={() => onClaimSide("white")} disabled={hasMySide} />
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] transition-colors shadow-[var(--shadow-2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none text-sm font-medium"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-10 h-10 rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] transition-colors shadow-[var(--shadow-2)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

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
    </div>
  );
}
