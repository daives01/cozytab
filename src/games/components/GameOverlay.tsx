import { useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ChessGame } from "../chess/ChessGame";
import { useGamePresence, type GameIdentity } from "../hooks/useGamePresence";
import { STARTING_FEN } from "../constants";
import type { VisitorState } from "@/hooks/useWebSocketPresence";

interface GameOverlayProps {
  isOpen: boolean;
  gameType: "chess";
  itemId: string;
  identity: GameIdentity;
  wsRef: React.RefObject<WebSocket | null>;
  visitors: VisitorState[];
  onClose: () => void;
  onPointerMove?: (clientX: number, clientY: number) => void;
  onGameActiveChange?: (gameItemId: string | null) => void;
}

export function GameOverlay({
  isOpen,
  gameType,
  itemId,
  identity,
  wsRef,
  visitors,
  onClose,
  onPointerMove,
  onGameActiveChange,
}: GameOverlayProps) {
  const { gameState, myMetadata, updateGameCursor, setGameMetadata } = useGamePresence({
    wsRef,
    itemId,
    identity,
    isOpen,
  });

  const claimSide = (side: "white" | "black") => {
    setGameMetadata({ side });
  };

  const mySide = (myMetadata.side as "white" | "black" | undefined) ?? null;

  const chessBoardState = useQuery(api.games.getChessBoardState, isOpen ? { itemId } : "skip");
  const makeChessMove = useMutation(api.games.makeChessMove);
  const resetChessBoard = useMutation(api.games.resetChessBoard);

  const fen = chessBoardState?.fen ?? STARTING_FEN;
  const lastMove = chessBoardState?.lastMove ?? undefined;

  const handleMove = async (move: { from: string; to: string; promotion?: string }, newFen: string) => {
    await makeChessMove({
      itemId,
      fen: newFen,
      lastMove: { from: move.from, to: move.to },
    });
  };

  const handleReset = async () => {
    await resetChessBoard({ itemId });
  };

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

  if (!isOpen) return null;

  const handlePointerMove = (e: React.PointerEvent) => {
    onPointerMove?.(e.clientX, e.clientY);
  };

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
            gameState={gameState}
            fen={fen}
            lastMove={lastMove}
            visitorId={identity.id}
            mySide={mySide}
            visitors={visitors}
            onMove={handleMove}
            onClaimSide={claimSide}
            onReset={handleReset}
            onCursorMove={updateGameCursor}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
