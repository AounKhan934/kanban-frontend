import { useState } from "react";
import { useBoard } from "../hooks/useBoard";
import Column from "./Column";
import PresenceBar from "./PresenceBar";
import Toasts from "./Toasts";
import BoardPageSkeleton from "./BoardPageSkeleton";
import { Skeleton } from "./Skeleton";

export default function BoardPage({ boardId, user, onBack }) {
  const b = useBoard(boardId, user);
  const [addingColumn, setAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState("");

  function submitNewColumn(e) {
    e.preventDefault();
    const trimmed = newColumnName.trim();
    if (!trimmed) return;
    b.addColumn(trimmed);
    setNewColumnName("");
    setAddingColumn(false);
  }

  return (
    <div className="board-page">
      <header className="board-page__header">
        <button className="btn btn--ghost" onClick={onBack}>
          ← Boards
        </button>
        {b.board?.name ? (
          <h1>{b.board.name}</h1>
        ) : (
          <Skeleton className="skeleton--line skeleton--title" />
        )}
        <PresenceBar onlineUsers={b.onlineUsers} connected={b.connected} />
      </header>

      {!b.joined ? (
        <BoardPageSkeleton />
      ) : (
        <div className="board-page__columns">
          {b.columns.map((col) => (
            <Column
              key={col._id}
              column={col}
              cards={b.cardsInColumn(col._id)}
              editingByCard={b.editingByCard}
              currentUserId={user.userId}
              onCreateCard={b.createCard}
              onUpdateCard={b.updateCard}
              onDeleteCard={b.deleteCard}
              onEditStart={b.startEditing}
              onEditStop={b.stopEditing}
              onMoveCard={b.moveCard}
              onRename={b.renameColumn}
              onDelete={b.removeColumn}
            />
          ))}

          <div className="column column--add">
            {addingColumn ? (
              <form onSubmit={submitNewColumn} className="column__add-form">
                <input
                  autoFocus
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  placeholder="Column name"
                  onBlur={() => {
                    if (!newColumnName.trim()) setAddingColumn(false);
                  }}
                />
                <div className="card__edit-actions">
                  <button className="btn btn--small" type="submit">
                    Add
                  </button>
                  <button
                    type="button"
                    className="btn btn--small btn--ghost"
                    onClick={() => setAddingColumn(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button className="column__add-btn" onClick={() => setAddingColumn(true)}>
                + Add column
              </button>
            )}
          </div>
        </div>
      )}

      <Toasts toasts={b.toasts} />
    </div>
  );
}
