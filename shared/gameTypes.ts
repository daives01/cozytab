export type GamePlayer = {
  visitorId: string;
  displayName: string;
  cursorColor?: string;
  side?: "white" | "black" | null;
};

export type GameCursor = {
  visitorId: string;
  x: number;
  y: number;
  cursorColor?: string;
};

export type GameType = "chess";

export type ChessGameData = {
  whitePlayer: string | null;
  blackPlayer: string | null;
};

export type GameDataByType = {
  chess: ChessGameData;
};

export type BaseGameState<T extends GameType> = {
  gameType: T;
  players: GamePlayer[];
  cursors: Record<string, GameCursor>;
  gameData: GameDataByType[T];
};

export type ChessGameState = BaseGameState<"chess">;

export type GameState = ChessGameState;

export type GameMessage =
  | { type: "game_join"; visitorId: string; displayName: string; cursorColor?: string; itemId: string }
  | { type: "game_leave"; visitorId: string; itemId: string }
  | { type: "game_cursor"; visitorId: string; itemId: string; x: number; y: number; cursorColor?: string }
  | { type: "game_move"; visitorId: string; itemId: string; move: { from: string; to: string; promotion?: string }; fen: string; lastMove: { from: string; to: string } }
  | { type: "game_claim_side"; visitorId: string; itemId: string; side: "white" | "black" }
  | { type: "game_reset"; visitorId: string; itemId: string }
  | { type: "game_state"; itemId: string; state: GameState };

export const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

export function createDefaultGameState<T extends GameType>(gameType: T): BaseGameState<T> {
  const base = {
    gameType,
    players: [],
    cursors: {},
  };

  if (gameType === "chess") {
    return {
      ...base,
      gameData: {
        whitePlayer: null,
        blackPlayer: null,
      },
    } as BaseGameState<T>;
  }

  const _exhaustive: never = gameType;
  throw new Error(`Unknown game type: ${_exhaustive}`);
}
