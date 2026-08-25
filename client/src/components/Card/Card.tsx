import { Card as MuiCard, CardContent, CardActions, Typography, IconButton, Chip, Box } from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import type { Card as CardType } from "../../types/board";

type CardProps = {
  card: CardType;
  onEdit: (card: CardType) => void;
  onDelete: (cardId: string) => void;
  editingUser?: string;
};

export default function Card({ card, onEdit, onDelete, editingUser }: CardProps) {
  const isPending = card.status === "pending";
  const isRejected = card.status === "rejected";

  return (
    <MuiCard
      variant="outlined"
      sx={{
        mb: 1,
        opacity: isPending ? 0.6 : 1,
        borderColor: isRejected ? "error.main" : undefined,
        transition: "opacity 0.2s, border-color 0.2s",
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
          {card.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {card.description}
        </Typography>

        {(isPending || editingUser) && (
          <Box sx={{ mt: 1, display: "flex", gap: 0.5 }}>
            {isPending && <Chip size="small" label="Saving…" color="default" />}
            {editingUser && <Chip size="small" label={`${editingUser} is editing`} color="info" />}
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ pt: 0 }}>
        <IconButton size="small" onClick={() => onEdit(card)} aria-label="edit">
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(card.id)} aria-label="delete">
          <DeleteIcon fontSize="small" />
        </IconButton>
      </CardActions>
    </MuiCard>
  );
}

