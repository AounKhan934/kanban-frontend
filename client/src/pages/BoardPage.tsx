import { useEffect, useState } from "react";
import { Dialog, DialogTitle, Snackbar, Alert, Container, Typography } from "@mui/material";
import Board from "../components/Board/Board";
import CardForm from "../components/Card/CardForm";
import { mockBoard } from "../state/mockBoard";
import { socket } from "../socket/socket";
import type { Board as BoardType, Card } from "../types/board";

const BOARD_ID = "board-1";

export default function BoardPage() {
  const [board, setBoard] = useState(mockBoard);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [creatingColumnId, setCreatingColumnId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingByCardId, setEditingByCardId] = useState<Record<string, string>>({});

  // Step 3: connect + join room + listen, once on mount
  useEffect(() => {
    socket.connect();
    socket.emit("board:join", { boardId: BOARD_ID });

    socket.on("board:state", (data: BoardType) => {
      setBoard(data);
      setIsSyncing(false);
    });

    socket.on("card:created", ({ operationId, card }: { operationId: string; card: Card }) => {
      confirmCard(operationId, card);
    });

    socket.on("card:updated", ({ operationId, card }: { operationId: string; card: Card }) => {
      confirmCard(operationId, card);
    });

    socket.on("card:deleted", ({ operationId }: { operationId: string; cardId: string; version: number }) => {
      confirmDelete(operationId);
    });

    socket.on("operation:rejected", ({ operationId, reason }: { operationId: string; reason: string }) => {
      rollback(operationId);
      setErrorMessage(`Change failed: ${reason}`);
    });

    socket.on("board:resync", () => {
      setIsSyncing(true);
      socket.emit("board:join", { boardId: BOARD_ID });
    });

    // Stubs for Abdullah's presence/editing UI — data is ready, no UI to show it yet
    socket.on("presence:update", (_data: { users: { userId: string; userName: string }[] }) => {
      // TODO(abdullah): render presence avatars/chips from _data.users
    });

    socket.on("card:editing:started", ({ cardId, userName }: { cardId: string; userId: string; userName: string }) => {
      setEditingByCardId((current) => ({ ...current, [cardId]: userName }));
    });

    socket.on("card:editing:stopped", ({ cardId }: { cardId: string; userId: string; userName: string }) => {
      setEditingByCardId((current) => {
        const next = { ...current };
        delete next[cardId];
        return next;
      });
    });

    // Not implemented yet — waiting on Abdullah's drag/drop to emit card:move
    // Applies a confirmed move from the server (or another user) to board state
    socket.on("card:moved", (data: { operationId: string; cardId: string; columnId: string; position: number; version: number }) => {
      applyMove(data.cardId, data.columnId, data.position, data.version);
    });

    return () => {
      socket.off("board:state");
      socket.off("card:created");
      socket.off("card:updated");
      socket.off("card:deleted");
      socket.off("operation:rejected");
      socket.off("board:resync");
      socket.off("presence:update");
      socket.off("card:editing:started");
      socket.off("card:editing:stopped");
      socket.off("card:moved");
      socket.disconnect();
    };
  }, []);

  // Step 4 helpers: replace an optimistic card once server confirms it
  function confirmCard(operationId: string, serverCard: Card) {
    setBoard((currentBoard) => ({
      ...currentBoard,
      columns: currentBoard.columns.map((column) => ({
        ...column,
        cards: column.cards.map((card) =>
          card.id === operationId || card.id === serverCard.id
            ? { ...serverCard, status: "idle" }
            : card
        ),
      })),
    }));
  }

  function confirmDelete(operationId: string) {
    setBoard((currentBoard) => ({
      ...currentBoard,
      columns: currentBoard.columns.map((column) => ({
        ...column,
        cards: column.cards.filter((card) => card.id !== operationId),
      })),
    }));
  }

  // Moves a card into (possibly) a new column at a given index, updating version
  function applyMove(cardId: string, toColumnId: string, position: number, version: number) {
    setBoard((currentBoard) => {
      let movedCard: Card | undefined;

      const withoutCard = currentBoard.columns.map((column) => {
        const found = column.cards.find((c) => c.id === cardId);
        if (found) movedCard = { ...found, columnId: toColumnId, version, status: "idle" };
        return { ...column, cards: column.cards.filter((c) => c.id !== cardId) };
      });

      if (!movedCard) return currentBoard;

      return {
        ...currentBoard,
        columns: withoutCard.map((column) => {
          if (column.id !== toColumnId) return column;
          const cards = [...column.cards];
          cards.splice(position, 0, movedCard!);
          return { ...column, cards };
        }),
      };
    });
  }

  // Ready for drag/drop to call: optimistic move + emit card:move
  function handleMoveCard(cardId: string, toColumnId: string, position: number) {
    const card = board.columns.flatMap((c) => c.cards).find((c) => c.id === cardId);
    if (!card) return;

    const operationId = crypto.randomUUID();
    applyMove(cardId, toColumnId, position, card.version); // optimistic, version confirmed on server response

    socket.emit("card:move", {
      operationId,
      boardId: BOARD_ID,
      cardId,
      fromColumnId: card.columnId,
      toColumnId,
      position,
      version: card.version,
    });
  }

  // On rejection: mark the card rejected, then remove it shortly after
  function rollback(operationId: string) {
    setBoard((currentBoard) => ({
      ...currentBoard,
      columns: currentBoard.columns.map((column) => ({
        ...column,
        cards: column.cards.map((card) =>
          card.id === operationId ? { ...card, status: "rejected" } : card
        ),
      })),
    }));

    setTimeout(() => {
      socket.emit("board:join", { boardId: BOARD_ID }); // re-fetch true state
    }, 600);
  }

  function handleCreateCard(columnId: string, title: string, description: string) {
    const operationId = crypto.randomUUID();
    const newCard: Card = {
      id: operationId, // temp id, replaced by server's real id on confirm
      title,
      description,
      columnId,
      version: 1,
      status: "pending",
    };

    setBoard((currentBoard) => ({
      ...currentBoard,
      columns: currentBoard.columns.map((column) =>
        column.id === columnId
          ? { ...column, cards: [...column.cards, newCard] }
          : column
      ),
    }));

    socket.emit("card:create", { operationId, boardId: BOARD_ID, columnId, title, description });
    setCreatingColumnId(null);
  }

  function handleUpdateCard(title: string, description: string) {
    if (!editingCard) return;
    const operationId = crypto.randomUUID();

    setBoard((currentBoard) => ({
      ...currentBoard,
      columns: currentBoard.columns.map((column) => ({
        ...column,
        cards: column.cards.map((card) =>
          card.id === editingCard.id ? { ...card, title, description, status: "pending" } : card
        ),
      })),
    }));

    socket.emit("card:update", {
      operationId,
      boardId: BOARD_ID,
      cardId: editingCard.id,
      title,
      description,
      version: editingCard.version,
    });

    setEditingCard(null);
  }

  function handleDeleteCard(cardId: string, version: number) {
    const operationId = crypto.randomUUID();

    setBoard((currentBoard) => ({
      ...currentBoard,
      columns: currentBoard.columns.map((column) => ({
        ...column,
        cards: column.cards.filter((card) => card.id !== cardId),
      })),
    }));

    socket.emit("card:delete", { operationId, boardId: BOARD_ID, cardId, version });
  }

  return (
    <Container maxWidth={false} sx={{ py: 2 }}>
      <Typography variant="h4" gutterBottom>
        {board.title}
      </Typography>

      <Board
        board={board}
        isSyncing={isSyncing}
        editingByCardId={editingByCardId}
        onMoveCard={handleMoveCard}
        onEditCard={(card) => setEditingCard(card)}
        onDeleteCard={(cardId) => {
          const card = board.columns.flatMap((c) => c.cards).find((c) => c.id === cardId);
          if (card) handleDeleteCard(cardId, card.version);
        }}
        onCreateCard={(columnId) => setCreatingColumnId(columnId)}
      />

      <Dialog open={!!creatingColumnId} onClose={() => setCreatingColumnId(null)} fullWidth maxWidth="sm">
        <DialogTitle>Create Card</DialogTitle>
        {creatingColumnId && (
          <CardForm
            columnId={creatingColumnId}
            onSave={(title, description) => handleCreateCard(creatingColumnId, title, description)}
            onCancel={() => setCreatingColumnId(null)}
          />
        )}
      </Dialog>

      <Dialog open={!!editingCard} onClose={() => setEditingCard(null)} fullWidth maxWidth="sm">
        <DialogTitle>Edit Card</DialogTitle>
        {editingCard && (
          <CardForm
            card={editingCard}
            columnId={editingCard.columnId}
            onSave={handleUpdateCard}
            onCancel={() => setEditingCard(null)}
          />
        )}
      </Dialog>

      <Snackbar open={!!errorMessage} autoHideDuration={4000} onClose={() => setErrorMessage(null)}>
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
