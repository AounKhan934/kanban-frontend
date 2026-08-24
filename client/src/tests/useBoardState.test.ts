import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useBoardState } from '../hooks/useBoardState';
import { createMockSocket } from './mockSocket';

const BOARD: any = {
  boardId: 'board-1',
  columns: [{ id: 'todo', name: 'Todo' }, { id: 'done', name: 'Done' }],
  cards: [
    { id: 'card-1', title: 'Card A', columnId: 'todo', position: 1000, version: 1 },
    { id: 'card-2', title: 'Card B', columnId: 'todo', position: 2000, version: 1 },
  ],
};

describe('useBoardState', () => {
  it('loads board state from board:state', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useBoardState(socket, 'board-1', 'u1', 'Abdullah'));

    act(() => socket.trigger('board:state', BOARD));

    expect(result.current.board?.cards).toHaveLength(2);
  });

  it('applies the move optimistically before any server response', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useBoardState(socket, 'board-1', 'u1', 'Abdullah'));
    act(() => socket.trigger('board:state', BOARD));

    act(() => result.current.moveCard('card-1', 'done', 500));

    const moved = result.current.board?.cards.find((c) => c.id === 'card-1');
    expect(moved?.columnId).toBe('done');
    expect(moved?.position).toBe(500);
    expect(result.current.pendingCount).toBe(1);

    // A card:move was emitted with an operationId per the contract.
    const emittedMove = socket.emit.mock.calls.find((c: any[]) => c[0] === 'card:move');
    expect(emittedMove).toBeTruthy();
    expect(emittedMove![1].operationId).toBeTruthy();
    expect(emittedMove![1].cardId).toBe('card-1');
    expect(emittedMove![1].toColumnId).toBe('done');
  });

  it('clears the pending operation once card:moved confirms it', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useBoardState(socket, 'board-1', 'u1', 'Abdullah'));
    act(() => socket.trigger('board:state', BOARD));
    act(() => result.current.moveCard('card-1', 'done', 500));

    const operationId = socket.emit.mock.calls.find((c: any[]) => c[0] === 'card:move')![1].operationId;

    act(() =>
      socket.trigger('card:moved', {
        operationId,
        cardId: 'card-1',
        columnId: 'done',
        position: 500,
        version: 2,
      })
    );

    expect(result.current.pendingCount).toBe(0);
    const card = result.current.board?.cards.find((c) => c.id === 'card-1');
    expect(card?.version).toBe(2);
  });

  it('rolls back the optimistic move when the server rejects it', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useBoardState(socket, 'board-1', 'u1', 'Abdullah'));
    act(() => socket.trigger('board:state', BOARD));
    act(() => result.current.moveCard('card-1', 'done', 500));

    const operationId = socket.emit.mock.calls.find((c: any[]) => c[0] === 'card:move')![1].operationId;

    act(() =>
      socket.trigger('operation:rejected', {
        operationId,
        reason: 'UNKNOWN',
        message: 'Move failed',
      })
    );

    const card = result.current.board?.cards.find((c) => c.id === 'card-1');
    expect(card?.columnId).toBe('todo');
    expect(card?.position).toBe(1000);
    expect(result.current.pendingCount).toBe(0);
  });

  it('requests a full resync on VERSION_CONFLICT instead of a local rollback', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useBoardState(socket, 'board-1', 'u1', 'Abdullah'));
    act(() => socket.trigger('board:state', BOARD));
    act(() => result.current.moveCard('card-1', 'done', 500));

    const operationId = socket.emit.mock.calls.find((c: any[]) => c[0] === 'card:move')![1].operationId;
    socket.emit.mockClear();

    act(() =>
      socket.trigger('operation:rejected', {
        operationId,
        reason: 'VERSION_CONFLICT',
        latestVersion: 5,
      })
    );

    const resyncCall = socket.emit.mock.calls.find((c: any[]) => c[0] === 'board:resync');
    expect(resyncCall).toBeTruthy();
  });

  it('never produces duplicate cards when card:created fires twice for the same id', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useBoardState(socket, 'board-1', 'u1', 'Abdullah'));
    act(() => socket.trigger('board:state', BOARD));

    const newCard = { id: 'card-3', title: 'New', columnId: 'todo', position: 3000, version: 1 };
    act(() => socket.trigger('card:created', { card: newCard }));
    act(() => socket.trigger('card:created', { card: newCard }));

    expect(result.current.board?.cards.filter((c) => c.id === 'card-3')).toHaveLength(1);
  });

  it('removes a card on card:deleted and drops any pending op referencing it', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useBoardState(socket, 'board-1', 'u1', 'Abdullah'));
    act(() => socket.trigger('board:state', BOARD));
    act(() => result.current.moveCard('card-1', 'done', 500));

    expect(result.current.pendingCount).toBe(1);

    act(() => socket.trigger('card:deleted', { cardId: 'card-1' }));

    expect(result.current.board?.cards.find((c) => c.id === 'card-1')).toBeUndefined();
    expect(result.current.pendingCount).toBe(0);
  });

  it('a full resync (board:state) clears any pending operations', () => {
    const socket = createMockSocket();
    const { result } = renderHook(() => useBoardState(socket, 'board-1', 'u1', 'Abdullah'));
    act(() => socket.trigger('board:state', BOARD));
    act(() => result.current.moveCard('card-1', 'done', 500));
    expect(result.current.pendingCount).toBe(1);

    act(() => socket.trigger('board:state', { ...BOARD, cards: [BOARD.cards[1]] }));

    expect(result.current.pendingCount).toBe(0);
    expect(result.current.board?.cards).toHaveLength(1);
  });
});
