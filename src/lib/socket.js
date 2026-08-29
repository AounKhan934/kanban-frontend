import { io } from "socket.io-client";

const SOCKET_URL =
  import.meta.env.VITE_SOCKET_URL ||
  import.meta.env.VITE_API_URL ||
  "https://kanban-backend-final-v7mc.onrender.com";

// autoConnect: false — useBoard() connects once it knows which board/user
// to join with, and disconnects on unmount instead of holding a global
// connection open for the whole app lifetime.
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ["websocket", "polling"],
});
