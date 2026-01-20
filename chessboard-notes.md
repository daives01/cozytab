# Chessboard Notes

## Completed ✅

### Architecture (Simplified)

**Worker (DO)** - Presence only:
- Who's in what game
- Cursor positions (ephemeral)
- Claimed sides (white/black)

**Convex** - Board state:
- `chessBoardStates` table with `itemId`, `fen`, `lastMove`
- Clients subscribe via `useQuery` and mutate via `useMutation`
- Realtime sync handled automatically by Convex

### Files Changed

- `convex/schema.ts` - Added `chessBoardStates` table
- `convex/games.ts` - `getChessBoardState`, `makeChessMove`, `resetChessBoard`
- `presence-worker/src/PresenceRoom.ts` - Simplified to presence-only (no Convex sync)
- `src/games/components/GameOverlay.tsx` - Uses Convex for FEN/moves
- `src/games/chess/ChessGame.tsx` - Receives `fen` and `lastMove` as props
- `src/games/hooks/useGamePresence.ts` - Removed `makeMove`/`resetGame` (now in Convex)
- `shared/gameTypes.ts` - `ChessGameData` only has `whitePlayer`/`blackPlayer`

### Data Flow

1. Player opens chess game → joins via WebSocket (DO tracks presence)
2. Player claims side → WebSocket message updates DO state, broadcasts to others
3. Player makes move → Convex mutation updates `chessBoardStates`, all clients see update via subscription
4. Player cursor moves → WebSocket broadcasts to others (ephemeral, not persisted)

### Future Games

Each game type gets its own Convex table:
- `chessBoardStates` - chess FEN + lastMove
- `checkersBoardStates` - checkers board array (future)
- etc.

Worker presence handles generic player/cursor tracking for all game types.



### what's left
- I want to add chess sounds
- the cursors when you're over a chess piece go back to OS. I need to show my custom cursors
