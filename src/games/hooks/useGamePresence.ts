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
  const [myMetadata, setMyMetadata] = useState<Record<string, unknown>>({});
  const lastCursorSendRef = useRef(0);
  const joinedRef = useRef(false);
  const lastCursorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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
            };
          });
        } else if (data.type === "game_cursor" && data.itemId === itemId) {
          setGameState((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              cursors: {
                ...prev.cursors,
                [data.visitorId]: {
                  visitorId: data.visitorId,
                  x: data.x,
                  y: data.y,
                  cursorColor: data.cursorColor,
                  gameMetadata: data.gameMetadata,
                },
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
        setMyMetadata({});
      }
    };
  }, [wsRef, isOpen, identity.id, identity.displayName, identity.cursorColor, itemId, sendMessage]);

  const updateGameCursor = useCallback(
    (x: number, y: number) => {
      lastCursorRef.current = { x, y };
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
        gameMetadata: Object.keys(myMetadata).length > 0 ? myMetadata : undefined,
      });
    },
    [identity.id, identity.cursorColor, itemId, myMetadata, sendMessage]
  );

  const setGameMetadata = useCallback(
    (metadata: Record<string, unknown>) => {
      setMyMetadata(metadata);
      // Immediately send cursor update with new metadata (bypass throttle)
      lastCursorSendRef.current = Date.now();
      sendMessage({
        type: "game_cursor",
        visitorId: identity.id,
        itemId,
        x: lastCursorRef.current.x,
        y: lastCursorRef.current.y,
        cursorColor: identity.cursorColor,
        gameMetadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    },
    [identity.id, identity.cursorColor, itemId, sendMessage]
  );

  return {
    gameState,
    myMetadata,
    updateGameCursor,
    setGameMetadata,
  };
}
