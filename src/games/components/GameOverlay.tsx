import { useEffect } from "react";
import { ChessGame } from "../chess/ChessGame";
import { useGamePresence, type GameIdentity } from "../hooks/useGamePresence";

interface GameOverlayProps {
  isOpen: boolean;
  gameType: "chess";
  itemId: string;
  identity: GameIdentity;
  wsRef: React.RefObject<WebSocket | null>;
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
  onClose,
  onPointerMove,
  onGameActiveChange,
}: GameOverlayProps) {
  const { gameState, updateGameCursor, makeMove, claimSide, resetGame } = useGamePresence({
    wsRef,
    itemId,
    identity,
    isOpen,
  });

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onPointerMove={handlePointerMove}
      onClick={onClose}
    >
      <div 
        className="animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {gameType === "chess" && (
          <ChessGame
            gameState={gameState}
            visitorId={identity.id}
            onMove={makeMove}
            onClaimSide={claimSide}
            onReset={resetGame}
            onCursorMove={updateGameCursor}
            onClose={onClose}
          />
        )}
      </div>
    </div>
  );
}
