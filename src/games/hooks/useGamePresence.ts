import { useCallback, useEffect, useRef, useState } from "react";
import type { GameState, GameMessage, GamePlayer } from "@shared/gameTypes";

export type { GameState, GamePlayer };

export type GameIdentity = {
  id: string;
  displayName: string;
  cursorColor?: string;
};

const THROTTLE_MS = 50;

interface UseGamePresenceProps {
  wsRef: React.RefObject<WebSocket | null>;
  itemId: string;
  identity: GameIdentity;
  isOpen: boolean;
}

export function useGamePresence({ wsRef, itemId, identity, isOpen }: UseGamePresenceProps) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const lastCursorSendRef = useRef(0);
  const joinedRef = useRef(false);

  const sendMessage = useCallback(
    (msg: GameMessage) => {
      const ws = wsRef.current;
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
    [wsRef]
  );

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || !isOpen) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as GameMessage;
        if (data.type === "game_state" && data.itemId === itemId) {
          setGameState(data.state);
        } else if (data.type === "game_move" && data.itemId === itemId) {
          setGameState((prev) =>
            prev ? { ...prev, fen: data.fen, lastMove: data.lastMove } : prev
          );
        } else if (data.type === "game_join" && data.itemId === itemId) {
          setGameState((prev) => {
            if (!prev) return prev;
            const exists = prev.players.some((p) => p.visitorId === data.visitorId);
            if (exists) return prev;
            return {
              ...prev,
              players: [
                ...prev.players,
                { visitorId: data.visitorId, displayName: data.displayName, cursorColor: data.cursorColor, side: null },
              ],
            };
          });
        } else if (data.type === "game_leave" && data.itemId === itemId) {
          setGameState((prev) => {
            if (!prev) return prev;
            const newCursors = { ...prev.cursors };
            delete newCursors[data.visitorId];
            return {
              ...prev,
              players: prev.players.filter((p) => p.visitorId !== data.visitorId),
              cursors: newCursors,
              whitePlayer: prev.whitePlayer === data.visitorId ? null : prev.whitePlayer,
              blackPlayer: prev.blackPlayer === data.visitorId ? null : prev.blackPlayer,
            };
          });
        } else if (data.type === "game_cursor" && data.itemId === itemId) {
          setGameState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              cursors: {
                ...prev.cursors,
                [data.visitorId]: { visitorId: data.visitorId, x: data.x, y: data.y, cursorColor: data.cursorColor },
              },
            };
          });
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [wsRef, itemId, isOpen]);

  useEffect(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !isOpen) return;

    if (!joinedRef.current) {
      sendMessage({
        type: "game_join",
        visitorId: identity.id,
        displayName: identity.displayName,
        cursorColor: identity.cursorColor,
        itemId,
      });
      joinedRef.current = true;
    }

    return () => {
      if (joinedRef.current) {
        sendMessage({ type: "game_leave", visitorId: identity.id, itemId });
        joinedRef.current = false;
        setGameState(null);
      }
    };
  }, [wsRef, isOpen, identity.id, identity.displayName, identity.cursorColor, itemId, sendMessage]);

  const updateGameCursor = useCallback(
    (x: number, y: number) => {
      const now = Date.now();
      if (now - lastCursorSendRef.current < THROTTLE_MS) return;
      lastCursorSendRef.current = now;
      sendMessage({
        type: "game_cursor",
        visitorId: identity.id,
        itemId,
        x,
        y,
        cursorColor: identity.cursorColor,
      });
    },
    [identity.id, identity.cursorColor, itemId, sendMessage]
  );

  const makeMove = useCallback(
    (move: { from: string; to: string; promotion?: string }, newFen: string) => {
      sendMessage({
        type: "game_move",
        visitorId: identity.id,
        itemId,
        move,
        fen: newFen,
        lastMove: { from: move.from, to: move.to },
      });
    },
    [identity.id, itemId, sendMessage]
  );

  const claimSide = useCallback(
    (side: "white" | "black") => {
      sendMessage({
        type: "game_claim_side",
        visitorId: identity.id,
        itemId,
        side,
      });
    },
    [identity.id, itemId, sendMessage]
  );

  const resetGame = useCallback(() => {
    sendMessage({
      type: "game_reset",
      visitorId: identity.id,
      itemId,
    });
  }, [identity.id, itemId, sendMessage]);

  return {
    gameState,
    updateGameCursor,
    makeMove,
    claimSide,
    resetGame,
  };
}
