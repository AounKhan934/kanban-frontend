import { Paper, Typography, Button, Box } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import type { Card as CardType, Column as ColumnType } from "../../types/board";
import Card from "../Card/Card";

type ColumnProps = {
  column: ColumnType;
  onEditCard: (card: CardType) => void;
  onDeleteCard: (cardId: string) => void;
  onCreateCard: () => void;
  onMoveCard?: (cardId: string, toColumnId: string, position: number) => void;
  editingByCardId?: Record<string, string>;
};

export default function Column({
  column,
  onEditCard,
  onDeleteCard,
  onCreateCard,
  editingByCardId,
}: ColumnProps) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 1.5, width: 300, flexShrink: 0, bgcolor: "grey.50" }}
    >
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography variant="h6">{column.title}</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={onCreateCard}>
          Add
        </Button>
      </Box>

      <Box>
        {column.cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            onEdit={onEditCard}
            onDelete={onDeleteCard}
            editingUser={editingByCardId?.[card.id]}
          />
        ))}
      </Box>
    </Paper>
  );
}

