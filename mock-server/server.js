/**
 * Mock server — implements the proposed events.md contract in-memory so
 * the Member 4 frontend can be developed/tested before the real backend
 * (owned by other team members) exists. Not meant for production use.
 *
 * Includes two `debug:*` events (createCard / deleteCard) purely to make
 * manual testing of Part 9-12 scenarios (concurrent edit, delete-while-
 * editing, reconnection) easy from the browser console. These are NOT
 * part of the proposed events.md contract.
 */
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
app.use(cors());
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

// ---- in-memory "database" -------------------------------------------------

const boards = new Map(); // boardId -> { columns, cards: Map<cardId, card> }
const presence = new Map(); // boardId -> Map<socketId, {id, name}>

function seedBoard(boardId) {
  const cards = new Map([
    ['card-1', { id: 'card-1', title: 'Fix authentication', columnId: 'todo', position: 1000, version: 1 }],
    ['card-2', { id: 'card-2', title: 'Design presence UI', columnId: 'todo', position: 2000, version: 1 }],
    ['card-3', { id: 'card-3', title: 'Wire up dnd-kit', columnId: 'in-progress', position: 1000, version: 1 }],
    ['card-4', { id: 'card-4', title: 'Write concurrency tests', columnId: 'done', position: 1000, version: 1 }],
  ]);
  boards.set(boardId, {
    columns: [
      { id: 'todo', name: 'Todo' },
      { id: 'in-progress', name: 'In Progress' },
      { id: 'done', name: 'Done' },
    ],
    cards,
  });
}

function getBoardStatePayload(boardId) {
  const board = boards.get(boardId);
  return {
    boardId,
    columns: board.columns,
    cards: Array.from(board.cards.values()),
  };
}

function broadcastPresence(boardId) {
  const map = presence.get(boardId) ?? new Map();
  io.to(`board:${boardId}`).emit('presence:update', {
    boardId,
    users: Array.from(map.values()),
  });
}

io.on('connection', (socket) => {
  let joinedBoardId = null;
  let user = null;

  socket.on('board:join', ({ boardId, userId, userName }) => {
    if (!boards.has(boardId)) seedBoard(boardId);
    joinedBoardId = boardId;
    user = { id: userId, name: userName };

    socket.join(`board:${boardId}`);
    if (!presence.has(boardId)) presence.set(boardId, new Map());
    presence.get(boardId).set(socket.id, user);

    socket.emit('board:state', getBoardStatePayload(boardId));
    broadcastPresence(boardId);
  });

  socket.on('board:resync', ({ boardId }) => {
    if (!boards.has(boardId)) return;
    socket.emit('board:state', getBoardStatePayload(boardId));
  });

  socket.on('board:leave', ({ boardId }) => {
    presence.get(boardId)?.delete(socket.id);
    socket.leave(`board:${boardId}`);
    broadcastPresence(boardId);
  });

  socket.on('card:move', ({ operationId, boardId, cardId, toColumnId, position, version }) => {
    const board = boards.get(boardId);
    const card = board?.cards.get(cardId);

    if (!card) {
      socket.emit('operation:rejected', { operationId, reason: 'CARD_NOT_FOUND', message: 'Card no longer exists.' });
      return;
    }
    if (card.version !== version) {
      socket.emit('operation:rejected', {
        operationId,
        reason: 'VERSION_CONFLICT',
        message: 'Card was changed by another user. Board synchronized.',
        latestVersion: card.version,
      });
      return;
    }

    card.columnId = toColumnId;
    card.position = position;
    card.version += 1;

    io.to(`board:${boardId}`).emit('card:moved', {
      operationId,
      cardId,
      columnId: card.columnId,
      position: card.position,
      version: card.version,
      movedBy: user?.id,
    });
  });

  socket.on('card:editing:start', ({ boardId, cardId, userId, userName }) => {
    io.to(`board:${boardId}`).emit('card:editing', { cardId, userId, userName, isEditing: true });
  });

  socket.on('card:editing:stop', ({ boardId, cardId, userId }) => {
    io.to(`board:${boardId}`).emit('card:editing', { cardId, userId, userName: user?.name, isEditing: false });
  });

  // ---- test-only helpers (not part of events.md) --------------------------
  socket.on('debug:createCard', ({ boardId, title, columnId }) => {
    const board = boards.get(boardId);
    if (!board) return;
    const id = `card-${Date.now()}`;
    const positions = Array.from(board.cards.values())
      .filter((c) => c.columnId === columnId)
      .map((c) => c.position);
    const card = { id, title, columnId, position: (positions.length ? Math.max(...positions) : 0) + 1000, version: 1 };
    board.cards.set(id, card);
    io.to(`board:${boardId}`).emit('card:created', { card });
  });

  socket.on('debug:deleteCard', ({ boardId, cardId }) => {
    const board = boards.get(boardId);
    if (!board?.cards.has(cardId)) return;
    board.cards.delete(cardId);
    io.to(`board:${boardId}`).emit('card:deleted', { cardId });
  });

  socket.on('disconnect', () => {
    if (joinedBoardId) {
      presence.get(joinedBoardId)?.delete(socket.id);
      broadcastPresence(joinedBoardId);
    }
  });
});

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Mock Kanban server listening on http://localhost:${PORT}`);
});
