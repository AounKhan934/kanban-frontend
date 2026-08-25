import { Box, Backdrop, CircularProgress, Typography } from "@mui/material";
import type { Board as BoardType, Card as CardType } from "../../types/board";
import Column from "../Column/Column";

type BoardProps = {
  board: BoardType;
  onEditCard: (card: CardType) => void;
  onDeleteCard: (cardId: string) => void;
  onCreateCard: (columnId: string) => void;
  onMoveCard?: (cardId: string, toColumnId: string, position: number) => void;
  editingByCardId?: Record<string, string>;
  isSyncing?: boolean;
};

export default function Board({
  board,
  onEditCard,
  onDeleteCard,
  onCreateCard,
  onMoveCard,
  editingByCardId,
  isSyncing,
}: BoardProps) {
  return (
    <Box sx={{ position: "relative" }}>
      <Backdrop
        open={!!isSyncing}
        sx={{ position: "absolute", zIndex: 1, color: "#fff" }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <CircularProgress color="inherit" size={28} />
          <Typography variant="body2">Syncing board…</Typography>
        </Box>
      </Backdrop>

      <Box
        component="main"
        sx={{ display: "flex", gap: 2, p: 2, overflowX: "auto" }}
      >
        {board.columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            onEditCard={onEditCard}
            onDeleteCard={onDeleteCard}
            onCreateCard={() => onCreateCard(column.id)}
            onMoveCard={onMoveCard}
            editingByCardId={editingByCardId}
          />
        ))}
      </Box>
    </Box>
  );
}
