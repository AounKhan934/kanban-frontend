import { useRef, useState } from "react";
import Card from "./Card";

export default function Column({
  column,
  cards,
  editingByCard,
  currentUserId,
  onCreateCard,
  onUpdateCard,
  onDeleteCard,
  onEditStart,
  onEditStop,
  onMoveCard,
  onRename,
  onDelete,
}) {
  const [addingCard, setAddingCard] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(column.name);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  // Guards against the form firing two submit events for one click/Enter
  // (e.g. Enter plus a near-simultaneous click on "Add" before the form
  // unmounts) — that was creating two cards from a single add.
  const submitLockRef = useRef(false);

  function submitNewCard(e) {
    e.preventDefault();
    if (submitLockRef.current) return;
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    submitLockRef.current = true;
    onCreateCard(column._id, trimmed);
    setNewTitle("");
    setAddingCard(false);
    setTimeout(() => {
      submitLockRef.current = false;
    }, 0);
  }

  function submitRename() {
    setRenaming(false);
    const trimmed = name.trim();
    if (trimmed && trimmed !== column.name) onRename(column._id, trimmed);
    else setName(column.name);
  }

  function handleDragStart(e, card) {
    e.dataTransfer.setData("text/plain", card._id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOverCard(e, card) {
    e.preventDefault();
    const index = cards.findIndex((c) => c._id === card._id);
    setDragOverIndex(index);
  }

  function handleColumnDragOver(e) {
    e.preventDefault();
    if (dragOverIndex === null) setDragOverIndex(cards.length);
  }

  function handleDrop(e) {
    e.preventDefault();
    const cardId = e.dataTransfer.getData("text/plain");
    const index = dragOverIndex === null ? cards.length : dragOverIndex;
    setDragOverIndex(null);
    if (cardId) onMoveCard(cardId, column._id, index);
  }

  return (
    <div
      className={`column ${dragOverIndex !== null ? "column--drag-over" : ""}`}
      onDragOver={handleColumnDragOver}
      onDragLeave={() => setDragOverIndex(null)}
      onDrop={handleDrop}
    >
      <div className="column__header">
        {renaming ? (
          <input
            className="column__name-input"
            value={name}
            autoFocus
            onChange={(e) => setName(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => e.key === "Enter" && submitRename()}
          />
        ) : (
          <span className="column__name" onClick={() => setRenaming(true)}>
            {column.name}
          </span>
        )}
        <span className="column__count">{cards.length}</span>
        <button
          className="column__icon-btn"
          title="Delete column"
          onClick={() => onDelete(column._id)}
        >
          ✕
        </button>
      </div>

      <div className="column__cards">
        {cards.map((card) => (
          <Card
            key={card._id}
            card={card}
            editingUsers={editingByCard[card._id]}
            currentUserId={currentUserId}
            onUpdate={onUpdateCard}
            onDelete={onDeleteCard}
            onEditStart={onEditStart}
            onEditStop={onEditStop}
            onDragStart={handleDragStart}
            onDragOverCard={handleDragOverCard}
          />
        ))}
      </div>

      {addingCard ? (
        <form className="column__add-form" onSubmit={submitNewCard}>
          <input
            autoFocus
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Card title"
            onBlur={() => {
              if (!newTitle.trim()) setAddingCard(false);
            }}
          />
          <div className="card__edit-actions">
            <button className="btn btn--small" type="submit">
              Add
            </button>
            <button
              type="button"
              className="btn btn--small btn--ghost"
              onClick={() => setAddingCard(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="column__add-btn" onClick={() => setAddingCard(true)}>
          + Add card
        </button>
      )}
    </div>
  );
}
