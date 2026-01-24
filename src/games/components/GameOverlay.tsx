import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ChessGame } from "../chess/ChessGame";
import { STARTING_FEN, PRESENCE_THROTTLE_MS } from "../constants";
import type { VisitorState } from "@/hooks/useWebSocketPresence";

interface GameOverlayProps {
  isOpen: boolean;
  gameType: "chess";
  itemId: string;
  visitorId: string;
  visitors: VisitorState[];
  setGameMetadata: (metadata: Record<string, unknown> | null) => void;
  onClose: () => void;
  onPointerMove?: (clientX: number, clientY: number) => void;
  onGameActiveChange?: (gameItemId: string | null) => void;
}

const THROTTLE_MS = PRESENCE_THROTTLE_MS;

export function GameOverlay({
  isOpen,
  gameType,
  itemId,
  visitorId,
  visitors,
  setGameMetadata,
  onClose,
  onPointerMove,
  onGameActiveChange,
}: GameOverlayProps) {
  const lastCursorSendRef = useRef(0);
  const gameMetadataRef = useRef<Record<string, unknown>>({});
  const hasInitializedRef = useRef(false);
  const [gameKey, setGameKey] = useState(0);
  const [resultOverlay, setResultOverlay] = useState<string | null>(null);
  const resultTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleGameEndRef = useRef<((message: string) => void) | null>(null);

  // Derive players in this game from visitors with matching inGame
  const playersInGame = useMemo(
    () => visitors.filter((v) => v.inGame === itemId),
    [visitors, itemId]
  );

  // Get my metadata from my visitor state (for display/logic only)
  const myVisitor = useMemo(
    () => visitors.find((v) => v.visitorId === visitorId),
    [visitors, visitorId]
  );
  const myMetadata = myVisitor?.gameMetadata ?? {};

  // Sync gameMetadataRef from visitor state on open/itemId change to prevent wiping side claim
  useEffect(() => {
    if (!isOpen) {
      // Reset on close to avoid cross-game leakage
      gameMetadataRef.current = {};
      hasInitializedRef.current = false;
      return;
    }
    // Only initialize once per game session to avoid overwriting local changes
    if (hasInitializedRef.current) return;
    // Wait until we have presence state before initializing to avoid locking in empty metadata
    if (!myVisitor) return;
    const serverMetadata = myVisitor.gameMetadata;
    if (serverMetadata && typeof serverMetadata === "object") {
      gameMetadataRef.current = serverMetadata as Record<string, unknown>;
    } else {
      gameMetadataRef.current = {};
    }
    hasInitializedRef.current = true;
  }, [isOpen, itemId, myVisitor]);

  // Merge metadata helper - always use local ref to avoid race conditions
  // between local changes and server echo-back
  const mergeGameMetadata = useCallback(
    (partial: Record<string, unknown>) => {
      const merged = { ...gameMetadataRef.current, ...partial };
      gameMetadataRef.current = merged;
      setGameMetadata(merged);
    },
    [setGameMetadata]
  );

  const claimSide = useCallback(
    (side: "white" | "black") => {
      mergeGameMetadata({ side });
    },
    [mergeGameMetadata]
  );

  const leaveSide = useCallback(() => {
    gameMetadataRef.current = {};
    setGameMetadata(null);
  }, [setGameMetadata]);

  const mySide = (myMetadata.side as "white" | "black" | undefined) ?? null;

  const sendSignal = useCallback(
    (signal: "resign" | "drawOffer" | "drawAccept" | "drawDecline" | null) => {
      if (signal === null) {
        const rest = Object.fromEntries(
          Object.entries(gameMetadataRef.current).filter(([k]) => k !== "gameSignal")
        );
        gameMetadataRef.current = rest;
        setGameMetadata(Object.keys(rest).length > 0 ? rest : null);
        return;
      }

      mergeGameMetadata({ gameSignal: signal });

      // Immediately show game-end UI for the initiator (don't wait for presence echo)
      if (signal === "drawAccept") {
        handleGameEndRef.current?.("Draw agreed!");
        return;
      }
      if (signal === "resign") {
        const msg =
          mySide === "white"
            ? "Black wins by resignation!"
            : mySide === "black"
              ? "White wins by resignation!"
              : "Game over by resignation!";
        handleGameEndRef.current?.(msg);
        return;
      }
    },
    [mergeGameMetadata, setGameMetadata, mySide]
  );

  // Deterministic tie-break: smallest visitorId wins a contested side
  // Self-heal effect: if I claimed a side but lost the tie-break, clear my claim
  useEffect(() => {
    if (!mySide || !isOpen) return;
    const claimants = playersInGame
      .filter((p) => p.gameMetadata?.side === mySide)
      .map((p) => p.visitorId)
      .sort();
    const winner = claimants[0];
    if (winner && winner !== visitorId) {
      // Only clear if we haven't already
      if (gameMetadataRef.current.side) {
        gameMetadataRef.current = {};
        setGameMetadata(null);
      }
    }
  }, [playersInGame, mySide, visitorId, isOpen, setGameMetadata]);

  const chessBoardState = useQuery(api.games.getChessBoardState, isOpen ? { itemId } : "skip");
  const makeChessMove = useMutation(api.games.makeChessMove).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.games.getChessBoardState, { itemId: args.itemId });
      if (current) {
        localStore.setQuery(api.games.getChessBoardState, { itemId: args.itemId }, {
          ...current,
          fen: args.fen,
          lastMove: args.lastMove,
        });
      }
    }
  );
  const resetChessBoard = useMutation(api.games.resetChessBoard);

  const isLoading = chessBoardState === undefined;
  const fen = chessBoardState?.fen ?? STARTING_FEN;
  const lastMove = chessBoardState?.lastMove ?? undefined;

  const handleMove = async (move: { from: string; to: string; promotion?: string }, newFen: string) => {
    try {
      await makeChessMove({
        itemId,
        fen: newFen,
        lastMove: { from: move.from, to: move.to },
      });
    } catch (e) {
      console.error("makeChessMove failed", e);
    }
  };

  const handleReset = useCallback(async () => {
    try {
      await resetChessBoard({ itemId });
      setGameKey((k) => k + 1);
    } catch (e) {
      console.error("resetChessBoard failed", e);
    }
  }, [resetChessBoard, itemId]);

  const handleGameEnd = useCallback(
    (message: string) => {
      // Prevent double-trigger if presence echo calls this after local immediate end
      if (resultOverlay) return;
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
      setResultOverlay(message);
      resultTimeoutRef.current = setTimeout(() => {
        setResultOverlay(null);
        sendSignal(null);
        handleReset();
      }, 1500);
    },
    [sendSignal, handleReset, resultOverlay]
  );

  // Keep ref in sync so sendSignal can call handleGameEnd without circular deps
  useEffect(() => {
    handleGameEndRef.current = handleGameEnd;
  }, [handleGameEnd]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (resultTimeoutRef.current) clearTimeout(resultTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    onGameActiveChange?.(isOpen ? itemId : null);
  }, [isOpen, itemId, onGameActiveChange]);

  // Throttled game cursor update - uses ref to avoid stale closure
  const updateGameCursor = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - lastCursorSendRef.current < THROTTLE_MS) return;
      lastCursorSendRef.current = now;
      // Merge cursor position into metadata using ref for fresh values
      mergeGameMetadata({ gameCursorX: x, gameCursorY: y });
    },
    [mergeGameMetadata]
  );

  if (!isOpen) return null;

  const handlePointerMove = (e: React.PointerEvent) => {
    onPointerMove?.(e.clientX, e.clientY);
  };

  // Don't render board until we have the game state to avoid flash of starting position
  if (isLoading) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onPointerMove={handlePointerMove}
      onClick={onClose}
    >
      <div 
        className=""
        onClick={(e) => e.stopPropagation()}
      >
        {gameType === "chess" && (
          <ChessGame
            key={gameKey}
            playersInGame={playersInGame}
            fen={fen}
            lastMove={lastMove}
            visitorId={visitorId}
            mySide={mySide}
            visitors={visitors}
            resultOverlay={resultOverlay}
            onMove={handleMove}
            onClaimSide={claimSide}
            onLeaveSide={leaveSide}
            onSignal={sendSignal}
            onGameEnd={handleGameEnd}
            onCursorMove={updateGameCursor}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
