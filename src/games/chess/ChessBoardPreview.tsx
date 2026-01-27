import { useMemo } from "react";

const PIECE_SVGS: Record<string, string> = {
  K: "/chess/Chess_klt45.svg",
  Q: "/chess/Chess_qlt45.svg",
  R: "/chess/Chess_rlt45.svg",
  B: "/chess/Chess_blt45.svg",
  N: "/chess/Chess_nlt45.svg",
  P: "/chess/Chess_plt45.svg",
  k: "/chess/Chess_kdt45.svg",
  q: "/chess/Chess_qdt45.svg",
  r: "/chess/Chess_rdt45.svg",
  b: "/chess/Chess_bdt45.svg",
  n: "/chess/Chess_ndt45.svg",
  p: "/chess/Chess_pdt45.svg",
};

// ============ TWEAK THESE CONSTANTS ============
// Board SVG is 1404x751, isometric projection
// All values are in % of container width/height

// Where the a8 square (top-left from white's view) center is
const ORIGIN_X = 50; // % from left
const ORIGIN_Y = 0;  // % from top

// How much to move per column (going right = a->h)
const COL_STEP_X = 6.3;  // % rightward per column
const COL_STEP_Y = 6;   // % downward per column

// How much to move per row (going down = 8->1)
const ROW_STEP_X = -6.3; // % leftward per row
const ROW_STEP_Y = 5.8;   // % downward per row

// Piece sizing
const PIECE_SIZE = 8; // % of container width
// ===============================================

interface ChessBoardPreviewProps {
  fen: string;
  width: number;
  height: number;
}

function parseFenBoard(fen: string): (string | null)[][] {
  const boardPart = fen.split(" ")[0];
  const rows = boardPart.split("/");
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
    board.push(boardRow);
  }

  return board;
}

export function ChessBoardPreview({ fen, width, height }: ChessBoardPreviewProps) {
  const board = useMemo(() => parseFenBoard(fen), [fen]);
  const pieceWidth = (PIECE_SIZE / 100) * width;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ width, height }}
    >
      {board.map((row, rowIdx) =>
        row.map((piece, colIdx) => {
          if (!piece) return null;
          const svg = PIECE_SVGS[piece];
          if (!svg) return null;

          // Calculate position based on row/col
          const xPercent = ORIGIN_X + colIdx * COL_STEP_X + rowIdx * ROW_STEP_X;
          const yPercent = ORIGIN_Y + colIdx * COL_STEP_Y + rowIdx * ROW_STEP_Y;

          return (
            <img
              key={`${rowIdx}-${colIdx}`}
              src={svg}
              alt={piece}
              className="absolute pointer-events-none"
              style={{
                width: pieceWidth,
                height: pieceWidth,
                left: `${xPercent}%`,
                top: `${yPercent}%`,
                transform: "translate(-50%, -50%)",
              }}
            />
          );
        })
      )}
    </div>
  );
}
