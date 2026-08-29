import { useEffect, useState } from "react";
import * as api from "../lib/api";
import BoardListSkeleton from "./BoardListSkeleton";
import { Spinner } from "./Skeleton";

export default function BoardList({ onOpenBoard }) {
  const [boards, setBoards] = useState(null);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api
      .getBoards()
      .then(setBoards)
      .catch(() => setError("Couldn't reach the backend. Is it running?"));
  }, []);

  async function submit(e) {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const board = await api.createBoard(trimmed);
      setNewName("");
      onOpenBoard(board._id);
    } catch {
      setError("Couldn't create that board — try again.");
    } finally {
      setCreating(false);
    }
  }

  const loading = boards === null && !error;

  return (
    <div className="board-list">
      <h1>Your boards</h1>

      {error && <div className="board-list__error">{error}</div>}

      {loading && <BoardListSkeleton />}

      {!loading && boards && boards.length === 0 && (
        <p className="muted">No boards yet — create the first one below.</p>
      )}

      {!loading && boards && boards.length > 0 && (
        <div className="board-list__grid">
          {boards.map((b) => (
            <button
              key={b._id}
              className="board-tile"
              data-initial={(b.name || "?").trim().charAt(0).toUpperCase() || "?"}
              onClick={() => onOpenBoard(b._id)}
            >
              {b.name}
            </button>
          ))}
        </div>
      )}

      <form className="board-list__new" onSubmit={submit}>
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="New board name"
        />
        <button className="btn" type="submit" disabled={creating}>
          {creating ? (
            <>
              <Spinner size={13} className="btn__spinner" />
              Creating…
            </>
          ) : (
            "Create board"
          )}
        </button>
      </form>
    </div>
  );
}
