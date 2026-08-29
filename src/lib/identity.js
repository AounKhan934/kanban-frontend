// A stable per-browser userId, plus a display name the person can edit.
// Both persist in localStorage so refreshing the page keeps "you" the same
// person in presence/editing indicators.

const USER_ID_KEY = "kanban.userId";
const USER_NAME_KEY = "kanban.userName";

function uuid() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getUserId() {
  let id = localStorage.getItem(USER_ID_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(USER_ID_KEY, id);
  }
  return id;
}

export function getUserName() {
  return (
    localStorage.getItem(USER_NAME_KEY) ||
    `Guest-${getUserId().slice(0, 4)}`
  );
}

export function setUserName(name) {
  const trimmed = name.trim();
  if (trimmed) localStorage.setItem(USER_NAME_KEY, trimmed);
}

export function newOperationId() {
  return uuid();
}
