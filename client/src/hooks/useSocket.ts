import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';

let sharedSocket: Socket | null = null;

/**
 * Returns a single shared Socket.IO client instance for the app.
 * A shared instance (rather than one per component) avoids duplicate
 * connections and duplicate listeners when multiple hooks need the socket.
 */
export function useSocket(): Socket {
  const socketRef = useRef<Socket | null>(null);

  if (!sharedSocket) {
    sharedSocket = io(SOCKET_URL, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });
  }
  socketRef.current = sharedSocket;

  useEffect(() => {
    // Nothing to clean up here — the socket is shared/app-lifetime.
    // Individual hooks are responsible for cleaning up their own
    // `.on(...)` listeners via `.off(...)` in their own effects.
  }, []);

  return socketRef.current;
}

