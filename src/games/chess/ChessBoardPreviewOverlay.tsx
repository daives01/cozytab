import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { ChessBoardPreview } from "./ChessBoardPreview";
import { STARTING_FEN } from "@shared/gameTypes";

interface ChessBoardPreviewOverlayProps {
  itemId: string;
}

export function ChessBoardPreviewOverlay({ itemId }: ChessBoardPreviewOverlayProps) {
  const chessBoardState = useQuery(api.games.getChessBoardState, { itemId });

  if (chessBoardState === undefined) return null;

  const fen = chessBoardState?.fen ?? STARTING_FEN;

  return (
    <div className="absolute top-0 left-0 w-full aspect-[1404/751]">
      <ChessBoardPreview fen={fen} />
    </div>
  );
}
