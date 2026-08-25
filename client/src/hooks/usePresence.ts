import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import type { UserRef } from '../types';

/**
 * Presence is entirely server-driven: we never try to infer who's viewing
 * the board from local socket connect/disconnect events. We just render
 * whatever `presence:update` says.
 */
export function usePresence(socket: Socket, boardId: string): UserRef[] {
  const [users, setUsers] = useState<UserRef[]>([]);

  useEffect(() => {
    const handlePresenceUpdate = (payload: { boardId: string; users: UserRef[] }) => {
      if (payload.boardId === boardId) setUsers(payload.users);
    };

    socket.on('presence:update', handlePresenceUpdate);
    return () => {
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, [socket, boardId]);

  return users;
}


