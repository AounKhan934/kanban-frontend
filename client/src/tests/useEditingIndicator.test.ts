import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useEditingIndicator } from '../hooks/useEditingIndicator';
import { createMockSocket } from './mockSocket';

describe('useEditingIndicator', () => {
  it('emits card:editing:start / stop with the shared payload shape', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useEditingIndicator(socket, 'board-1', 'u1', 'Abdullah'));

    act(() => result.current.startEditing('card-1'));
    expect(socket.emit).toHaveBeenCalledWith('card:editing:start', {
      boardId: 'board-1',
      cardId: 'card-1',
      userId: 'u1',
      userName: 'Abdullah',
    });

    act(() => result.current.stopEditing('card-1'));
    expect(socket.emit).toHaveBeenCalledWith('card:editing:stop', {
      boardId: 'board-1',
      cardId: 'card-1',
      userId: 'u1',
    });
  });

  it('tracks other users editing a card via card:editing broadcasts', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useEditingIndicator(socket, 'board-1', 'u1', 'Abdullah'));

    act(() => socket.trigger('card:editing', { cardId: 'card-1', userId: 'u2', userName: 'Sara', isEditing: true }));

    expect(result.current.getEditors('card-1')).toEqual([{ userId: 'u2', userName: 'Sara' }]);

    act(() => socket.trigger('card:editing', { cardId: 'card-1', userId: 'u2', userName: 'Sara', isEditing: false }));
    expect(result.current.getEditors('card-1')).toEqual([]);
  });

  it('never shows the current user their own editing indicator', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useEditingIndicator(socket, 'board-1', 'u1', 'Abdullah'));

    act(() => socket.trigger('card:editing', { cardId: 'card-1', userId: 'u1', userName: 'Abdullah', isEditing: true }));

    expect(result.current.getEditors('card-1')).toEqual([]);
  });

  it('stops editing every actively-edited card on unmount (no stale indicators)', () => {
    const socket = createMockSocket();
    const { result, unmount } = renderHook(() => useEditingIndicator(socket, 'board-1', 'u1', 'Abdullah'));

    act(() => result.current.startEditing('card-1'));
    socket.emit.mockClear();

    unmount();

    expect(socket.emit).toHaveBeenCalledWith('card:editing:stop', {
      boardId: 'board-1',
      cardId: 'card-1',
      userId: 'u1',
    });
  });

  it('stops editing every actively-edited card on socket disconnect', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useEditingIndicator(socket, 'board-1', 'u1', 'Abdullah'));

    act(() => result.current.startEditing('card-1'));
    act(() => result.current.startEditing('card-2'));
    socket.emit.mockClear();

    act(() => socket.trigger('disconnect'));

    const stopCalls = socket.emit.mock.calls.filter((c: any[]) => c[0] === 'card:editing:stop');
    expect(stopCalls).toHaveLength(2);
  });
});

