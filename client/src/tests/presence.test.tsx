import { act, render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePresence } from '../hooks/usePresence';
import { PresenceBar } from '../components/Presence/PresenceBar';
import { createMockSocket } from './mockSocket';

describe('usePresence', () => {
  it('starts empty and updates from presence:update', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => usePresence(socket, 'board-1'));

    expect(result.current).toEqual([]);

    act(() =>
      socket.trigger('presence:update', {
        boardId: 'board-1',
        users: [{ id: 'u1', name: 'Abdullah' }, { id: 'u2', name: 'Sara' }],
      })
    );

    expect(result.current).toHaveLength(2);
    expect(result.current[0].name).toBe('Abdullah');
  });

  it('ignores presence updates for a different board', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => usePresence(socket, 'board-1'));

    act(() =>
      socket.trigger('presence:update', { boardId: 'other-board', users: [{ id: 'u9', name: 'X' }] })
    );

    expect(result.current).toEqual([]);
  });

  it('removes a user from the UI once presence:update reflects the disconnect', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => usePresence(socket, 'board-1'));

    act(() =>
      socket.trigger('presence:update', {
        boardId: 'board-1',
        users: [{ id: 'u1', name: 'Abdullah' }, { id: 'u2', name: 'Sara' }],
      })
    );
    act(() => socket.trigger('presence:update', { boardId: 'board-1', users: [{ id: 'u1', name: 'Abdullah' }] }));

    expect(result.current).toHaveLength(1);
    expect(result.current[0].name).toBe('Abdullah');
  });
});

describe('PresenceBar', () => {
  it('renders one avatar per user', () => {
    render(<PresenceBar users={[{ id: 'u1', name: 'Abdullah' }, { id: 'u2', name: 'Sara' }]} />);
    expect(screen.getAllByTestId('presence-avatar')).toHaveLength(2);
  });

  it('shows a fallback when nobody else is viewing', () => {
    render(<PresenceBar users={[]} />);
    expect(screen.getByText('Just you')).toBeInTheDocument();
  });
});

