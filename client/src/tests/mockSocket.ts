import { vi } from 'vitest';

/**
 * A minimal fake of the socket.io-client `Socket` surface used by our
 * hooks (`on`, `off`, `emit`, plus `connected`/`io.on`/`io.off` for the
 * connection-status hook). Lets tests trigger server events directly via
 * `mockSocket.trigger(event, payload)` without a real network/server.
 */
export function createMockSocket() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();

  const socket: any = {
    connected: true,
    emit: vi.fn(),
    on: vi.fn((event: string, handler: (...args: any[]) => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(handler);
      return socket;
    }),
    off: vi.fn((event: string, handler?: (...args: any[]) => void) => {
      if (!listeners.has(event)) return socket;
      if (handler) listeners.get(event)!.delete(handler);
      else listeners.delete(event);
      return socket;
    }),
    io: {
      on: vi.fn(),
      off: vi.fn(),
    },
    trigger(event: string, payload?: any) {
      listeners.get(event)?.forEach((handler) => handler(payload));
    },
  };

  return socket;
}
