import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Chessboard } from "react-chessboard";
import type { ChessboardOptions } from "react-chessboard";
import { Chess } from "chess.js";
import type { Square } from "chess.js";
import { STARTING_FEN } from "../constants";
import type { VisitorState } from "@/hooks/useWebSocketPresence";
import { CursorDisplay } from "@/presence/CursorDisplay";
import { useChatFade } from "@/hooks/useChatFade";
import { Crown, X, LogOut, Flag, Handshake, RotateCcw } from "lucide-react";
import { useChessSounds } from "./useChessSounds";

interface ChessCursorProps {
  displayX: number;
  displayY: number;
  cursorColor?: string;
  chatMessage: string | null;
  rotated: boolean;
}

function ChessCursor({ displayX, displayY, cursorColor, chatMessage, rotated }: ChessCursorProps) {
  const { displayedMessage, chatOpacity } = useChatFade(chatMessage);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${displayX}%`,
        top: `${displayY}%`,
        transform: "translate(-50%, -50%)",
        zIndex: 10,
        transition: "left 50ms linear, top 50ms linear",
      }}
    >
      <CursorDisplay
        x={0}
        y={0}
        cursorColor={cursorColor}
        chatMessage={displayedMessage}
        chatOpacity={chatOpacity}
        hidePointer={false}
        scale={1}
        rotated={rotated}
      />
    </div>
  );
}

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
  onReset: () => void;
  onCursorMove: (x: number, y: number) => void;
  onClose: () => void;
}

function DrawOfferBanner({
  onAccept,
  onDecline,
}: {
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="bg-[var(--color-background)] rounded-xl border-2 border-[var(--color-foreground)] shadow-[var(--shadow-4)] px-3 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium whitespace-nowrap">Draw offer</span>
        <button
          type="button"
          onClick={onAccept}
          className="px-2 py-1 rounded-lg border-2 border-[var(--color-foreground)] bg-[var(--color-share-accent)] text-xs font-medium shadow-[var(--shadow-2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={onDecline}
          className="px-2 py-1 rounded-lg border-2 border-[var(--color-foreground)] bg-[var(--color-muted)] text-xs font-medium shadow-[var(--shadow-2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
        >
          Decline
        </button>
      </div>
    </div>
  );
}

function DrawDeclinedBanner() {
  return (
    <div className="bg-[var(--color-background)] rounded-xl border-2 border-[var(--color-foreground)] shadow-[var(--shadow-4)] px-3 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <span className="text-xs font-medium whitespace-nowrap">Draw declined</span>
    </div>
  );
}

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return (
    <div className="relative group">
      {children}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-[var(--color-foreground)] text-[var(--color-background)] text-xs font-medium rounded-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50">
        {text}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[var(--color-foreground)]" />
      </div>
    </div>
  );
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
    ? "bg-[var(--color-foreground)] text-[var(--color-background)]"
    : "bg-[var(--color-background)] text-[var(--color-foreground)]";

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
            className={`p-1 rounded-md -mr-1 transition-colors ${side === "black" ? "hover:bg-[var(--color-background)]/20" : "hover:bg-[var(--color-foreground)]/10"}`}
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
      <span className="text-sm font-medium opacity-60">Join</span>
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
  onReset,
  onCursorMove,
  onClose,
}: ChessGameProps) {
  const boardRef = useRef<HTMLDivElement>(null);
  const handledResultRef = useRef<string | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{ from: Square; to: Square } | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<Set<Square>>(new Set());
  const { playMoveSound } = useChessSounds();
  const prevFenRef = useRef(serverFen);
  const [drawDeclinedAt, setDrawDeclinedAt] = useState<number | null>(null);

  const [isLandscape, setIsLandscape] = useState(() => typeof window !== "undefined" && window.innerWidth > window.innerHeight);

  useEffect(() => {
    const handleResize = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const fen = serverFen;
  const lastMove = serverLastMove;

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

  // Check for draw offer from opponent (hide if we've declined or if we're the one offering)
  const mySignal = playerSignals.find((p) => p.visitorId === visitorId)?.signal;
  const opponent = mySide
    ? playerSignals.find((p) => p.visitorId !== visitorId && p.side !== mySide)
    : undefined;
  const opponentSignal = opponent?.signal;
  const opponentDrawOffer =
    mySide && opponentSignal === "drawOffer" && mySignal !== "drawDecline" && mySignal !== "drawOffer"
      ? opponent
      : undefined;

  // Signal handshake lifecycle:
  // 1. Offerer clears their "drawOffer" when opponent declines
  // 2. Decliner clears their "drawDecline" when offerer's offer is gone (or new offer arrives)
  const prevOpponentSignalRef = useRef<GameSignal | undefined>(undefined);
  useEffect(() => {
    const prevOpponent = prevOpponentSignalRef.current;
    prevOpponentSignalRef.current = opponentSignal;

    if (!mySide) return;

    // Offerer: clear my offer when opponent declines, show declined message
    if (mySignal === "drawOffer" && opponentSignal === "drawDecline") {
      queueMicrotask(() => setDrawDeclinedAt(Date.now()));
      onSignal(null);
      return;
    }

    // Decliner: clear my decline when offer is gone OR a new offer arrives
    if (mySignal === "drawDecline") {
      const opponentNowOffering = opponentSignal === "drawOffer";
      const opponentWasOffering = prevOpponent === "drawOffer";
      // Clear if: offer gone, or new offer detected (heals missed transitions)
      if (!opponentNowOffering || (opponentNowOffering && !opponentWasOffering)) {
        onSignal(null);
      }
    }
  }, [mySide, mySignal, opponentSignal, onSignal]);

  // Auto-clear draw declined message after 2 seconds
  useEffect(() => {
    if (drawDeclinedAt === null) return;
    const timer = setTimeout(() => setDrawDeclinedAt(null), 2000);
    return () => clearTimeout(timer);
  }, [drawDeclinedAt]);

  const showDrawDeclined = drawDeclinedAt !== null;

  // Clear local UI state when game resets to starting position
  useEffect(() => {
    if (fen === STARTING_FEN) {
      /* eslint-disable react-hooks/set-state-in-effect -- intentional reset on game restart */
      setPendingPromotion(null);
      setSelectedSquare(null);
      setPossibleMoves(new Set());
      /* eslint-enable react-hooks/set-state-in-effect */
      handledResultRef.current = null;
    }
  }, [fen]);

  // Check for mutual draw accept
  const drawAccepted = playerSignals.some((p) => p.signal === "drawAccept");

  // Derive result key to detect unique game-ending events
  const resultKey = resignedPlayer
    ? `resign:${resignedPlayer.visitorId}`
    : drawAccepted
      ? "draw"
      : chess.isCheckmate()
        ? `checkmate:${fen}`
        : chess.isStalemate()
          ? `stalemate:${fen}`
          : chess.isDraw()
            ? `draw:${fen}`
            : null;

  // Notify parent of game-ending signals (resign, draw accept, checkmate, stalemate)
  useEffect(() => {
    if (!resultKey || handledResultRef.current === resultKey) return;
    handledResultRef.current = resultKey;

    let message: string;
    if (resignedPlayer) {
      message = `${resignedPlayer.side === "white" ? "Black" : "White"} wins by resignation!`;
    } else if (drawAccepted) {
      message = "Draw agreed!";
    } else if (chess.isCheckmate()) {
      message = `Checkmate! ${chess.turn() === "w" ? "Black" : "White"} wins!`;
    } else if (chess.isStalemate()) {
      message = "Stalemate!";
    } else if (chess.isDraw()) {
      message = "Draw!";
    } else {
      return;
    }

    onGameEnd(message);
  }, [resultKey, resignedPlayer, drawAccepted, chess, onGameEnd]);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setPossibleMoves(new Set());
  }, []);

  const tryMove = useCallback(
    (from: Square, to: Square, promotion?: string) => {
      try {
        const tempChess = new Chess(fen);
        const move = tempChess.move({ from, to, promotion });
        if (move) {
          const newFen = tempChess.fen();
          onMove({ from, to, promotion }, newFen);
          clearSelection();
          return true;
        }
      } catch {
        // Invalid move
      }
      return false;
    },
    [fen, onMove, clearSelection]
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
      if (!targetSquare || !mySide || !isMyTurn || resultOverlay) return false;
      const from = sourceSquare as Square;
      const to = targetSquare as Square;

      if (needsPromotion(from, to)) {
        setPendingPromotion({ from, to });
        return false;
      }

      return tryMove(from, to);
    },
    [mySide, isMyTurn, resultOverlay, needsPromotion, tryMove]
  );

  const handleSquareClick = useCallback(
    ({ square }: { piece: unknown; square: string }) => {
      if (!mySide || !isMyTurn || resultOverlay) return;
      const sq = square as Square;

      if (selectedSquare) {
        if (possibleMoves.has(sq)) {
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
        setPossibleMoves(new Set(chess.moves({ square: sq, verbose: true }).map((m) => m.to as Square)));
      }
    },
    [chess, mySide, isMyTurn, resultOverlay, selectedSquare, possibleMoves, needsPromotion, tryMove, clearSelection]
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
        const visitor = visitors.find((v) => v.visitorId === player.visitorId);

        return {
          visitorId: player.visitorId,
          cursorColor: player.cursorColor,
          displayX: needsFlip ? 100 - gameCursorX : gameCursorX,
          displayY: needsFlip ? 100 - gameCursorY : gameCursorY,
          needsFlip,
          chatMessage: visitor?.chatMessage ?? null,
        };
      });
  }, [playersInGame, visitorId, mySide, getCursorOwnerSide, visitors]);

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

  // Can join a side if: (1) it's empty, and (2) either I have no side OR I'm alone (can switch)
  const otherPlayerExists = (whitePlayerId && whitePlayerId !== visitorId) || (blackPlayerId && blackPlayerId !== visitorId);
  const canJoinWhite = !whitePlayer && (!mySide || !otherPlayerExists);
  const canJoinBlack = !blackPlayer && (!mySide || !otherPlayerExists);

  const topBadgeSide = boardOrientation === "white" ? "black" : "white";
  const bottomBadgeSide = boardOrientation === "white" ? "white" : "black";
  const topPlayer = topBadgeSide === "white" ? whitePlayer : blackPlayer;
  const bottomPlayer = bottomBadgeSide === "white" ? whitePlayer : blackPlayer;
  const canJoinTop = topBadgeSide === "white" ? canJoinWhite : canJoinBlack;
  const canJoinBottom = bottomBadgeSide === "white" ? canJoinWhite : canJoinBlack;

  const BOARD_SIZE = "min(85vw, 85vh, 700px)";

  const controlButtons = (
    <div className="flex items-center gap-2 h-8">
      <Tooltip text={otherPlayerExists ? "Resign" : "Reset"}>
        <button
          type="button"
          onClick={() => (otherPlayerExists ? onSignal("resign") : onReset())}
          disabled={!mySide}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 border-[var(--color-foreground)] bg-[var(--color-background)] text-xs font-medium transition-colors ${mySide ? "hover:bg-[var(--color-muted)]" : "opacity-0 pointer-events-none"}`}
        >
          {otherPlayerExists ? <Flag className="w-3 h-3" /> : <RotateCcw className="w-3 h-3" />}
        </button>
      </Tooltip>
      <Tooltip text="Offer draw">
        <button
          type="button"
          onClick={() => onSignal("drawOffer")}
          disabled={!otherPlayerExists || !!opponentDrawOffer || mySignal === "drawOffer"}
          className={`flex items-center gap-1 px-2 py-1.5 rounded-lg border-2 border-[var(--color-foreground)] bg-[var(--color-background)] text-xs font-medium transition-colors ${mySide ? "hover:bg-[var(--color-muted)] disabled:opacity-50 disabled:cursor-not-allowed" : "opacity-0 pointer-events-none"}`}
        >
          <Handshake className="w-3 h-3" />
        </button>
      </Tooltip>
      <button
        type="button"
        onClick={onClose}
        className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-[var(--color-foreground)] bg-[var(--color-background)] hover:bg-[var(--color-muted)] transition-colors shadow-[var(--shadow-2)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  const statusIndicator = (
    <div className="h-10 flex items-center justify-center min-w-[100px]">
      {gameStatus ? (
        <div className="px-3 py-1.5 rounded-xl border-2 border-[var(--color-foreground)] bg-[var(--color-accent)] text-[var(--color-foreground)] text-sm font-bold shadow-[var(--shadow-2)]">
          {gameStatus}
        </div>
      ) : (
        <div
          className={`px-4 py-2 rounded-xl border-2 border-[var(--color-foreground)] font-medium shadow-[var(--shadow-2)] transition-colors ${
            !mySide ? "opacity-0" : isMyTurn ? "bg-[var(--color-share-accent)] text-[var(--color-foreground)]" : "bg-[var(--color-muted)] text-[var(--color-foreground)]"
          }`}
        >
          {isMyTurn ? "Your turn!" : "Waiting..."}
        </div>
      )}
    </div>
  );

  if (isLandscape) {
    return (
      <div
        className="relative flex items-center justify-center select-none animate-in fade-in duration-150"
        style={{ "--board-size": BOARD_SIZE } as React.CSSProperties}
      >
        {/* Left panel - player badges aligned to board edges */}
        <div
          className="absolute flex flex-col justify-between items-end pr-4"
          style={{ height: `var(--board-size)`, right: `calc(50% + var(--board-size) / 2)` }}
        >
          <PlayerBadge
            side={topBadgeSide}
            player={topPlayer}
            isMe={mySide === topBadgeSide}
            canJoin={canJoinTop}
            onJoin={() => onClaimSide(topBadgeSide)}
            onLeave={onLeaveSide}
          />
          <PlayerBadge
            side={bottomBadgeSide}
            player={bottomPlayer}
            isMe={mySide === bottomBadgeSide}
            canJoin={canJoinBottom}
            onJoin={() => onClaimSide(bottomBadgeSide)}
            onLeave={onLeaveSide}
          />
        </div>

        {/* Board - always centered */}
        <div
          ref={boardRef}
          className="relative aspect-square"
          style={{ width: `var(--board-size)` }}
          onMouseMove={handleMouseMove}
          onPointerMove={handleMouseMove}
        >
          <div className="absolute inset-0 rounded-xl overflow-hidden border-4 border-[var(--color-foreground)] shadow-[var(--shadow-8)]">
            <Chessboard
              options={{
                position: fen,
                onPieceDrop: handleDrop,
                onSquareClick: handleSquareClick,
                boardOrientation,
                squareStyles,
                allowDragging: !!mySide && isMyTurn && !resultOverlay,
                boardStyle: { borderRadius: "0" },
                darkSquareStyle: { backgroundColor: "#b58863" },
                lightSquareStyle: { backgroundColor: "#f0d9b5" },
              } satisfies ChessboardOptions}
            />
          </div>
          {otherCursors.map((cursor) => (
            <ChessCursor
              key={cursor.visitorId}
              displayX={cursor.displayX}
              displayY={cursor.displayY}
              cursorColor={cursor.cursorColor}
              chatMessage={cursor.chatMessage}
              rotated={cursor.needsFlip}
            />
          ))}
          {opponentDrawOffer && mySide && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20">
              <DrawOfferBanner
                onAccept={() => onSignal("drawAccept")}
                onDecline={() => onSignal("drawDecline")}
              />
            </div>
          )}
          {showDrawDeclined && (
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20">
              <DrawDeclinedBanner />
            </div>
          )}
        </div>

        {/* Right panel - controls top, status bottom */}
        <div
          className="absolute flex flex-col justify-between items-start pl-4"
          style={{ height: `var(--board-size)`, left: `calc(50% + var(--board-size) / 2)` }}
        >
          {controlButtons}
          {statusIndicator}
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

        {/* Result overlay */}
        {resultOverlay && (
          <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
            <div className="bg-[var(--color-background)] rounded-2xl border-2 border-[var(--color-foreground)] shadow-[var(--shadow-8)] px-8 py-6 animate-in fade-in zoom-in duration-200">
              <p className="text-xl font-bold text-center">{resultOverlay}</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 select-none animate-in fade-in duration-150" style={{ width: BOARD_SIZE }}>
      {/* Top controls - portrait */}
      <div className="flex items-center justify-between w-full">
        <PlayerBadge
          side={topBadgeSide}
          player={topPlayer}
          isMe={mySide === topBadgeSide}
          canJoin={canJoinTop}
          onJoin={() => onClaimSide(topBadgeSide)}
          onLeave={onLeaveSide}
        />
        {controlButtons}
      </div>

      {/* Board */}
      <div
        ref={boardRef}
        className="relative aspect-square w-full"
        onMouseMove={handleMouseMove}
        onPointerMove={handleMouseMove}
      >
        <div className="absolute inset-0 rounded-xl overflow-hidden border-4 border-[var(--color-foreground)] shadow-[var(--shadow-8)]">
          <Chessboard
            options={{
              position: fen,
              onPieceDrop: handleDrop,
              onSquareClick: handleSquareClick,
              boardOrientation,
              squareStyles,
              allowDragging: !!mySide && isMyTurn && !resultOverlay,
              boardStyle: { borderRadius: "0" },
              darkSquareStyle: { backgroundColor: "#b58863" },
              lightSquareStyle: { backgroundColor: "#f0d9b5" },
            } satisfies ChessboardOptions}
          />
        </div>
        {otherCursors.map((cursor) => (
          <ChessCursor
            key={cursor.visitorId}
            displayX={cursor.displayX}
            displayY={cursor.displayY}
            cursorColor={cursor.cursorColor}
            chatMessage={cursor.chatMessage}
            rotated={cursor.needsFlip}
          />
        ))}
        {opponentDrawOffer && mySide && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20">
            <DrawOfferBanner
              onAccept={() => onSignal("drawAccept")}
              onDecline={() => onSignal("drawDecline")}
            />
          </div>
        )}
        {showDrawDeclined && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 -translate-y-full z-20">
            <DrawDeclinedBanner />
          </div>
        )}
      </div>

      {/* Bottom controls - portrait */}
      <div className="flex items-center justify-between w-full">
        <PlayerBadge
          side={bottomBadgeSide}
          player={bottomPlayer}
          isMe={mySide === bottomBadgeSide}
          canJoin={canJoinBottom}
          onJoin={() => onClaimSide(bottomBadgeSide)}
          onLeave={onLeaveSide}
        />
        {statusIndicator}
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

      {/* Result overlay */}
      {resultOverlay && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-[var(--color-background)] rounded-2xl border-2 border-[var(--color-foreground)] shadow-[var(--shadow-8)] px-8 py-6 animate-in fade-in zoom-in duration-200">
            <p className="text-xl font-bold text-center">{resultOverlay}</p>
          </div>
        </div>
      )}
    </div>
  );
}
