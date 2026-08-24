import { useCallback, useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';
import { EditingPayload } from '../types';

/**
 * Tracks, for every card, which OTHER users currently have it open for
 * editing (never includes the current user). This is purely informational
 * — it does NOT prevent anyone from editing a card someone else has open.
 *
 * `editingByCard['card-123']` -> array of user names currently editing it.
 */
export function useEditingIndicator(
  socket: Socket,
  boardId: string,
  userId: string,
  userName: string
) {
  const [editingByCard, setEditingByCard] = useState<Record<string, { userId: string; userName: string }[]>>(
    {}
  );
  // Track which cards *we* are currently editing, so we can clean them all
  // up on disconnect without the caller having to remember.
  const activelyEditing = useRef<Set<string>>(new Set());

  useEffect(() => {
    const handleEditing = (payload: EditingPayload) => {
      if (payload.userId === userId) return; // never show our own indicator to ourselves
      setEditingByCard((prev) => {
        const current = prev[payload.cardId] ?? [];
        if (payload.isEditing) {
          if (current.some((u) => u.userId === payload.userId)) return prev;
          return { ...prev, [payload.cardId]: [...current, { userId: payload.userId, userName: payload.userName }] };
        }
        return { ...prev, [payload.cardId]: current.filter((u) => u.userId !== payload.userId) };
      });
    };

    socket.on('card:editing', handleEditing);
    return () => {
      socket.off('card:editing', handleEditing);
    };
  }, [socket, userId]);

  const startEditing = useCallback(
    (cardId: string) => {
      activelyEditing.current.add(cardId);
      socket.emit('card:editing:start', { boardId, cardId, userId, userName });
    },
    [socket, boardId, userId, userName]
  );

  const stopEditing = useCallback(
    (cardId: string) => {
      activelyEditing.current.delete(cardId);
      socket.emit('card:editing:stop', { boardId, cardId, userId });
    },
    [socket, boardId, userId]
  );

  // Cleanup: on disconnect (network drop, tab close via beforeunload, or
  // this hook unmounting), stop editing everything we were editing so we
  // never leave a stale "X is editing" indicator for other users.
  useEffect(() => {
    const stopAll = () => {
      for (const cardId of activelyEditing.current) {
        socket.emit('card:editing:stop', { boardId, cardId, userId });
      }
      activelyEditing.current.clear();
    };

    socket.on('disconnect', stopAll);
    window.addEventListener('beforeunload', stopAll);

    return () => {
      stopAll();
      socket.off('disconnect', stopAll);
      window.removeEventListener('beforeunload', stopAll);
    };
  }, [socket, boardId, userId]);

  const getEditors = useCallback(
    (cardId: string) => editingByCard[cardId] ?? [],
    [editingByCard]
  );

  return { startEditing, stopEditing, getEditors };
}
