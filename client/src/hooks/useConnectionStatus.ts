import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import type { ConnectionStatus } from '../types';

/**
 * Tracks Socket.IO connection state and — critically — does NOT assume
 * that a Socket.IO-level reconnect means the frontend's board state is
 * still correct. On every reconnect we ask the caller to resync
 * (`onReconnected`), which should emit `board:resync` and wait for a
 * fresh `board:state` before flipping the status to "connected".
 */
export function useConnectionStatus(
  socket: Socket,
  boardId: string,
  onReconnected: () => void
): ConnectionStatus {
  const [status, setStatus] = useState<ConnectionStatus>(
    socket.connected ? 'connected' : 'reconnecting'
  );

  useEffect(() => {
    let hasConnectedBefore = socket.connected;

    const handleConnect = () => {
      if (hasConnectedBefore) {
        // This is a RE-connect, not the first connect — local state may
        // be stale. Request a full resync before declaring ourselves
        // "connected" again.
        setStatus('syncing');
        onReconnected();
      } else {
        setStatus('connected');
      }
      hasConnectedBefore = true;
    };

    const handleDisconnect = () => setStatus('disconnected');
    const handleReconnectAttempt = () => setStatus('reconnecting');
    // Once the resync's board:state snapshot lands, we're genuinely
    // back in sync — flip out of "syncing" into "connected".
    const handleBoardState = () => setStatus((prev) => (prev === 'syncing' ? 'connected' : prev));

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('board:state', handleBoardState);
    socket.io.on('reconnect_attempt', handleReconnectAttempt);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('board:state', handleBoardState);
      socket.io.off('reconnect_attempt', handleReconnectAttempt);
    };
  }, [socket, boardId, onReconnected]);

  return status;
}


