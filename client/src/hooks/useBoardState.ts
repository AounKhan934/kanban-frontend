import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import {
  BoardState,
  CardData,
  MovedPayload,
  PendingOperation,
  RejectedOperationPayload,
} from '../types';

function genOperationId(): string {
  // crypto.randomUUID is available in all modern browsers Vite targets.
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `op-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

interface UseBoardStateResult {
  board: BoardState | null;
  moveCard: (cardId: string, toColumnId: string, position: number) => void;
  requestResync: () => void;
  pendingCount: number;
  lastRejection: RejectedOperationPayload | null;
}

/**
 * Owns the board's card/column state and implements the optimistic-move
 * flow described in the Member 4 spec:
 *
 *   drag -> update local UI immediately -> generate operationId
 *        -> emit card:move -> (server validates/persists/broadcasts)
 *        -> card:moved confirms  OR  operation:rejected -> rollback/resync
 */
export function useBoardState(
  socket: Socket,
  boardId: string,
  userId: string,
  userName: string
): UseBoardStateResult {
  const [board, setBoard] = useState<BoardState | null>(null);
  const [lastRejection, setLastRejection] = useState<RejectedOperationPayload | null>(null);
  const pendingOperations = useRef<Map<string, PendingOperation>>(new Map());
  const [pendingCount, setPendingCount] = useState(0);

  const applyBoardState = useCallback((state: BoardState) => {
    setBoard(state);
    // A full resync makes every in-flight optimistic operation obsolete —
    // the server snapshot is authoritative, so drop anything pending.
    pendingOperations.current.clear();
    setPendingCount(0);
  }, []);

  const requestResync = useCallback(() => {
    socket.emit('board:resync', { boardId });
  }, [socket, boardId]);

  useEffect(() => {
    socket.emit('board:join', { boardId, userId, userName });

    const handleBoardState = (state: BoardState) => {
      if (state.boardId === boardId) applyBoardState(state);
    };

    const handleCardMoved = (payload: MovedPayload) => {
      // Confirm/clear our own pending optimistic op, if this was ours.
      if (payload.operationId && pendingOperations.current.has(payload.operationId)) {
        pendingOperations.current.delete(payload.operationId);
        setPendingCount(pendingOperations.current.size);
      }
      setBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          cards: prev.cards.map((c) =>
            c.id === payload.cardId
              ? { ...c, columnId: payload.columnId, position: payload.position, version: payload.version }
              : c
          ),
        };
      });
    };

    const handleOperationRejected = (payload: RejectedOperationPayload) => {
      setLastRejection(payload);
      const pending = pendingOperations.current.get(payload.operationId);
      if (pending) {
        pendingOperations.current.delete(payload.operationId);
        setPendingCount(pendingOperations.current.size);

        if (payload.reason === 'VERSION_CONFLICT' || payload.reason === 'CARD_NOT_FOUND') {
          // Local state is meaningfully out of date — safest is a full
          // resync rather than trying to hand-patch it.
          requestResync();
        } else {
          // Simple rollback: restore this one card's previous known state.
          setBoard((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              cards: prev.cards.map((c) =>
                c.id === pending.cardId
                  ? {
                      ...c,
                      columnId: pending.previousState.columnId,
                      position: pending.previousState.position,
                      version: pending.previousState.version,
                    }
                  : c
              ),
            };
          });
        }
      }
    };

    const handleCardCreated = ({ card }: { card: CardData }) => {
      setBoard((prev) => {
        if (!prev) return prev;
        if (prev.cards.some((c) => c.id === card.id)) return prev; // no dupes
        return { ...prev, cards: [...prev.cards, card] };
      });
    };

    const handleCardDeleted = ({ cardId }: { cardId: string }) => {
      setBoard((prev) => (prev ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) } : prev));
      // If a delete arrives for a card we had a pending move on, drop it —
      // there's nothing left to confirm/rollback.
      for (const [opId, op] of pendingOperations.current.entries()) {
        if (op.cardId === cardId) pendingOperations.current.delete(opId);
      }
      setPendingCount(pendingOperations.current.size);
    };

    socket.on('board:state', handleBoardState);
    socket.on('card:moved', handleCardMoved);
    socket.on('operation:rejected', handleOperationRejected);
    socket.on('card:created', handleCardCreated);
    socket.on('card:deleted', handleCardDeleted);

    return () => {
      socket.off('board:state', handleBoardState);
      socket.off('card:moved', handleCardMoved);
      socket.off('operation:rejected', handleOperationRejected);
      socket.off('card:created', handleCardCreated);
      socket.off('card:deleted', handleCardDeleted);
      socket.emit('board:leave', { boardId });
    };
  }, [socket, boardId, userId, userName, applyBoardState, requestResync]);

  const moveCard = useCallback(
    (cardId: string, toColumnId: string, position: number) => {
      setBoard((prev) => {
        if (!prev) return prev;
        const card = prev.cards.find((c) => c.id === cardId);
        if (!card) return prev;

        const operationId = genOperationId();
        pendingOperations.current.set(operationId, {
          type: 'card:move',
          cardId,
          previousState: { columnId: card.columnId, position: card.position, version: card.version },
          createdAt: Date.now(),
        });
        setPendingCount(pendingOperations.current.size);

        // 1. Optimistic local update — happens synchronously, before the
        //    server has seen anything.
        const optimisticCards = prev.cards.map((c) =>
          c.id === cardId ? { ...c, columnId: toColumnId, position } : c
        );

        // 2. Fire the event per the shared contract.
        socket.emit('card:move', {
          operationId,
          boardId,
          cardId,
          fromColumnId: card.columnId,
          toColumnId,
          position,
          version: card.version,
        });

        return { ...prev, cards: optimisticCards };
      });
    },
    [socket, boardId]
  );

  return { board, moveCard, requestResync, pendingCount, lastRejection };
}
