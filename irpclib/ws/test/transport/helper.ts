import { vi } from 'vitest';

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyType = any;

export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onclose: ((event: AnyType) => void) | null = null;
  onerror: ((event: AnyType) => void) | null = null;
  onmessage: ((event: AnyType) => void) | null = null;
  send = vi.fn();
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSING;
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED;
      if (this.onclose) this.onclose({ wasClean: true });
    }, 0);
  });

  constructor(
    public url: string,
    public protocols?: string[]
  ) {}
}
