import { useState } from "react";

export default function Card({
  card,
  editingUsers,
  currentUserId,
  onUpdate,
  onDelete,
  onEditStart,
  onEditStop,
  onDragStart,
  onDragOverCard,
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");

  const othersEditing = (editingUsers || []).filter((u) => u.userId !== currentUserId);

  function beginEdit() {
    setTitle(card.title);
    setDescription(card.description || "");
    setEditing(true);
    onEditStart(card._id);
  }

  function save() {
    setEditing(false);
    onEditStop(card._id);
    const trimmed = title.trim();
    if (!trimmed) return;
    if (trimmed !== card.title || description !== (card.description || "")) {
      onUpdate(card._id, { title: trimmed, description });
    }
  }

  function cancel() {
    setEditing(false);
    onEditStop(card._id);
    setTitle(card.title);
    setDescription(card.description || "");
  }

  return (
    <div
      className={`card ${card._pending ? "card--pending" : ""}`}
      draggable={!editing}
      onDragStart={(e) => onDragStart(e, card)}
      onDragOver={(e) => onDragOverCard(e, card)}
    >
      {othersEditing.length > 0 && (
        <div className="card__editing-badge">
          {othersEditing.map((u) => u.userName).join(", ")} editing…
        </div>
      )}

      {editing ? (
        <div className="card__edit-form">
          <input
            className="card__title-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
          <textarea
            className="card__desc-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Description (optional)"
          />
          <div className="card__edit-actions">
            <button className="btn btn--small" onClick={save}>
              Save
            </button>
            <button className="btn btn--small btn--ghost" onClick={cancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="card__title" onClick={beginEdit}>
            {card.title}
          </div>
          {card.description && <div className="card__desc">{card.description}</div>}
          <div className="card__footer">
            <button
              className="card__icon-btn card__icon-btn--edit"
              onClick={beginEdit}
              title="Edit"
            >
              ✎
            </button>
            <button
              className="card__icon-btn"
              onClick={() => onDelete(card._id)}
              title="Delete"
            >
              ✕
            </button>
          </div>
        </>
      )}
    </div>
  );
}
