export const WS_MESSAGE_TYPE = {
  CANCEL: 'cancel',
} as const;

export const DEFAULT_RECONNECT_DELAY = 1000;
export const DEFAULT_MAX_RECONNECT_ATTEMPTS = 5;
export const DEFAULT_CONNECTION_TIMEOUT = 10000;

/**
 * WebSocket connection states.
 */
export enum WebSocketState {
  CONNECTING = 0,
  OPEN = 1,
  CLOSING = 2,
  CLOSED = 3,
}
/**
 * Configuration options for WebSocket resolver
 */
export const FILE_BUFFER_TTL = 30_000;
