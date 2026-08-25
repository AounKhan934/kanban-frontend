import { useState } from "react";
import { TextField, Button, DialogContent, DialogActions } from "@mui/material";
import type { Card } from "../../types/board";

type CardFormProps = {
  card?: Card;
  columnId: string;
  onSave: (title: string, description: string) => void;
  onCancel: () => void;
};

export default function CardForm({ card, onSave, onCancel }: CardFormProps) {
  const [title, setTitle] = useState(card?.title ?? "");
  const [description, setDescription] = useState(card?.description ?? "");

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    onSave(title.trim(), description.trim());
  }

  return (
    <form onSubmit={handleSubmit}>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
        <TextField
          label="Card title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
          fullWidth
        />
        <TextField
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          multiline
          minRows={3}
          fullWidth
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="contained">
          {card ? "Save" : "Create"}
        </Button>
      </DialogActions>
    </form>
  );
}
