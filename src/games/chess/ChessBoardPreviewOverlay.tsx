import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ChessBoardPreview } from "./ChessBoardPreview";
import { STARTING_FEN } from "@shared/gameTypes";

interface ChessBoardPreviewOverlayProps {
  itemId: string;
  width: number;
}

export function ChessBoardPreviewOverlay({ itemId, width }: ChessBoardPreviewOverlayProps) {
  const chessBoardState = useQuery(api.games.getChessBoardState, { itemId });
  const fen = chessBoardState?.fen ?? STARTING_FEN;

  // Board SVG aspect ratio is 1404:751
  const height = (width * 751) / 1404;

  return <ChessBoardPreview fen={fen} width={width} height={height} />;
}
