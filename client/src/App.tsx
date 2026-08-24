import { useCallback, useEffect, useMemo, useState } from 'react';
import { BoardDnd } from './components/DragDrop/BoardDnd';
import { PresenceBar } from './components/Presence/PresenceBar';
import { ConnectionStatusBadge } from './components/ConnectionStatus/ConnectionStatus';
import { useSocket } from './hooks/useSocket';
import { useBoardState } from './hooks/useBoardState';
import { usePresence } from './hooks/usePresence';
import { useConnectionStatus } from './hooks/useConnectionStatus';
import { useEditingIndicator } from './hooks/useEditingIndicator';
import './styles.css';

const BOARD_ID = 'board-1';

function getOrCreateUser() {
  let name = sessionStorage.getItem('kanban-user-name');
  if (!name) {
    name = window.prompt('Your name?', 'Guest') || 'Guest';
    sessionStorage.setItem('kanban-user-name', name);
  }
  let id = sessionStorage.getItem('kanban-user-id');
  if (!id) {
    id = `u-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    sessionStorage.setItem('kanban-user-id', id);
  }
  return { id, name };
}

export default function App() {
  const socket = useSocket();
  const user = useMemo(getOrCreateUser, []);
  const { board, moveCard, requestResync, pendingCount, lastRejection } = useBoardState(
    socket,
    BOARD_ID,
    user.id,
    user.name
  );
  const presenceUsers = usePresence(socket, BOARD_ID);
  const status = useConnectionStatus(socket, BOARD_ID, requestResync);
  const { startEditing, stopEditing, getEditors } = useEditingIndicator(socket, BOARD_ID, user.id, user.name);

  const [openCardId, setOpenCardId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (lastRejection) {
      setNotice(lastRejection.message ?? 'Card was changed by another user. Board synchronized.');
      const t = setTimeout(() => setNotice(null), 4000);
      return () => clearTimeout(t);
    }
  }, [lastRejection]);

  const handleOpenCard = useCallback(
    (cardId: string) => {
      setOpenCardId(cardId);
      startEditing(cardId);
    },
    [startEditing]
  );

  const handleCloseCard = useCallback(() => {
    if (openCardId) stopEditing(openCardId);
    setOpenCardId(null);
  }, [openCardId, stopEditing]);

  // If the card being edited gets deleted by someone else, close the
  // stale editor instead of letting it linger.
  useEffect(() => {
    if (openCardId && board && !board.cards.some((c) => c.id === openCardId)) {
      setOpenCardId(null);
      setNotice('That card was deleted. Editor closed.');
    }
  }, [board, openCardId]);

  const editingByCard = useMemo(() => {
    const map: Record<string, { userId: string; userName: string }[]> = {};
    if (board) {
      for (const card of board.cards) map[card.id] = getEditors(card.id);
    }
    return map;
  }, [board, getEditors]);

  return (
    <div className="kanban-app">
      <header className="kanban-header">
        <h1>Kanban Board</h1>
        <div className="kanban-header-right">
          {pendingCount > 0 && <span className="kanban-pending">Syncing {pendingCount}…</span>}
          <ConnectionStatusBadge status={status} />
          <PresenceBar users={presenceUsers} />
        </div>
      </header>

      {notice && <div className="kanban-notice">{notice}</div>}

      {!board ? (
        <div className="kanban-loading">Loading board…</div>
      ) : (
        <BoardDnd board={board} editingByCard={editingByCard} onOpenCard={handleOpenCard} onMove={moveCard} />
      )}

      {openCardId && board && (
        <div className="kanban-modal-backdrop" onClick={handleCloseCard}>
          <div className="kanban-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{board.cards.find((c) => c.id === openCardId)?.title}</h2>
            <p className="kanban-modal-hint">
              (Editing indicator sent to other users while this is open — this is not a lock.)
            </p>
            <button onClick={handleCloseCard}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
