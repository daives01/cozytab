import { useMemo } from "react";

const PIECE_SVGS: Record<string, string> = {
  K: "/chess/white_king.svg",
  Q: "/chess/white_queen.svg",
  R: "/chess/white_rook.svg",
  B: "/chess/white_bishop.svg",
  N: "/chess/white_knight.svg",
  P: "/chess/white_pawn.svg",
  k: "/chess/black_king.svg",
  q: "/chess/black_queen.svg",
  r: "/chess/black_rook.svg",
  b: "/chess/black_bishop.svg",
  n: "/chess/black_knight.svg",
  p: "/chess/black_pawn.svg",
};

// ============ TWEAK THESE CONSTANTS ============
// Board SVG is 1404x751, isometric projection
// All values are in % of container width/height

// Where the a8 square (top-left from white's view) center is
const ORIGIN_X = 50; // % from left
const ORIGIN_Y = 8;  // % from top

// How much to move per column (going right = a->h)
const COL_STEP_X = 6.2;  // % rightward per column
const COL_STEP_Y = 5.8;   // % downward per column

// How much to move per row (going down = 8->1)
const ROW_STEP_X = -6.2; // % leftward per row
const ROW_STEP_Y = 5.7;   // % downward per row

// Piece sizing
const PIECE_SIZE = 6; // % of container width
// ===============================================

interface ChessBoardPreviewProps {
  fen: string;
}

const EMPTY_BOARD: (string | null)[][] = Array.from({ length: 8 }, () =>
  Array.from({ length: 8 }, () => null)
);

function parseFenBoard(fen: string): (string | null)[][] {
  try {
    const boardPart = fen.split(" ")[0];
    const rows = boardPart.split("/");

    if (rows.length !== 8) return EMPTY_BOARD;

    const board: (string | null)[][] = [];

    for (const row of rows) {
      const boardRow: (string | null)[] = [];
      for (const char of row) {
        if (/[1-8]/.test(char)) {
          for (let i = 0; i < parseInt(char, 10); i++) {
            boardRow.push(null);
          }
        } else {
          boardRow.push(char);
        }
      }
      if (boardRow.length !== 8) return EMPTY_BOARD;
      board.push(boardRow);
    }

    return board;
  } catch {
    return EMPTY_BOARD;
  }
}

export function ChessBoardPreview({ fen }: ChessBoardPreviewProps) {
  const board = useMemo(() => parseFenBoard(fen), [fen]);

  return (
    <div className="absolute inset-0 w-full h-full pointer-events-none">
      {board.map((row, rowIdx) =>
        row.map((piece, colIdx) => {
          if (!piece) return null;
          const svg = PIECE_SVGS[piece];
          if (!svg) return null;

          const xPercent = ORIGIN_X + colIdx * COL_STEP_X + rowIdx * ROW_STEP_X;
          const yPercent = ORIGIN_Y + colIdx * COL_STEP_Y + rowIdx * ROW_STEP_Y;

          return (
            <img
              key={`${rowIdx}-${colIdx}`}
              src={svg}
              alt={piece}
              className="absolute pointer-events-none"
              style={{
                width: `${PIECE_SIZE}%`,
                height: "auto",
                left: `${xPercent}%`,
                top: `${yPercent}%`,
                transform: "translate(-50%, -100%)",
              }}
            />
          );
        })
      )}
    </div>
  );
}
