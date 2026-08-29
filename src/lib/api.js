// REST client for the parts of the backend that are REST-only.
//
// IMPORTANT: per the backend's events.md, columns have NO Socket.IO events —
// column create/update/delete only exist as REST routes
// (server/src/routes/column.routes.js). Cards and boards use Socket.IO for
// everything realtime; boards are only listed/created over REST.

const API_URL = import.meta.env.VITE_API_URL || "https://kanban-backend-final-v7mc.onrender.com";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (res.status === 204) return null;

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const error = new Error(data?.error || `REQUEST_FAILED_${res.status}`);
    error.status = res.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export function getBoards() {
  return request("/boards");
}

export function createBoard(name) {
  return request("/boards", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function createColumn(boardId, name, position) {
  return request("/columns", {
    method: "POST",
    body: JSON.stringify({ boardId, name, position }),
  });
}

export function updateColumn(columnId, data) {
  return request(`/columns/${columnId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export function deleteColumn(columnId) {
  return request(`/columns/${columnId}`, { method: "DELETE" });
}
