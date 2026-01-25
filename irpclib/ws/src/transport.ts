import {
  ERROR_CODE,
  ERROR_MESSAGE,
  type IRPCCall,
  type IRPCData,
  type IRPCRequest,
  type IRPCResponse,
  IRPCTransport,
  type TransportConfig,
} from '@irpclib/irpc';

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
 * Configuration interface for WebSocket transport.
 * Extends the base TransportConfig with WebSocket-specific options.
 */
export type WebSocketTransportConfig = TransportConfig & {
  /**
   * The WebSocket URL to connect to.
   * Required parameter that defines the WebSocket endpoint.
   */
  url: string;

  /**
   * Custom protocols to use for the WebSocket connection.
   * Optional array of sub-protocols.
   */
  protocols?: string[];

  /**
   * Maximum number of reconnection attempts.
   * Defaults to 5 if not provided.
   */
  maxReconnectAttempts?: number;

  /**
   * The delay between reconnection attempts.
   * Defaults to 1000ms if not provided.
   */
  reconnectDelay?: number;

  /**
   * Whether to automatically reconnect when the connection is lost.
   * Defaults to true if not provided.
   */
  autoReconnect?: boolean;

  /**
   * Connection timeout in milliseconds.
   * Defaults to 10000ms if not provided.
   */
  connectionTimeout?: number;

  /**
   * Custom headers to be included in the WebSocket connection.
   * Note: Not all WebSocket clients support custom headers.
   */
  headers?: Record<string, string>;
};

/**
 * WebSocket transport implementation for IRPC communication.
 * Handles sending RPC calls over WebSocket and processing real-time responses.
 */
export class WebSocketTransport extends IRPCTransport {
  /**
   * The WebSocket instance.
   */
  private ws?: WebSocket;

  /**
   * Current connection state.
   */
  public get state() {
    return this.ws?.readyState ?? WebSocketState.CLOSED;
  }

  /**
   * Whether the connection is currently open.
   */
  public get isOpen() {
    return this.state === WebSocketState.OPEN;
  }

  /**
   * Gets the WebSocket URL endpoint.
   * Returns the configured URL.
   */
  public get endpoint(): string {
    return this.config.url;
  }

  /**
   * Pending calls waiting for responses.
   */
  private pendingCalls = new Map<string, IRPCCall>();

  /**
   * Reconnection attempt counter.
   */
  private reconnectAttempts = 0;

  /**
   * Whether reconnection is currently in progress.
   */
  private isReconnecting = false;

  /**
   * Pending connection promise to prevent multiple simultaneous connection attempts.
   */
  private pendingConnection?: Promise<void>;

  /**
   * Creates a new WebSocket transport instance.
   * @param config - The configuration for this transport instance.
   */
  constructor(public config: WebSocketTransportConfig) {
    super(config);
  }

  /**
   * Establishes a WebSocket connection.
   */
  private async connect(): Promise<void> {
    if (this.pendingConnection) {
      return this.pendingConnection;
    }

    this.pendingConnection = new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);

        const timeout = setTimeout(() => {
          this.ws?.close();
          reject(new Error(ERROR_MESSAGE[ERROR_CODE.TIMEOUT]));
        }, this.config.connectionTimeout ?? DEFAULT_CONNECTION_TIMEOUT);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.reconnectAttempts = 0;
          this.isReconnecting = false;
          delete this.pendingConnection;
          resolve();
        };

        this.ws.onclose = (event) => {
          clearTimeout(timeout);
          delete this.pendingConnection;
          this.handleClose(event);
        };

        this.ws.onerror = (event) => {
          clearTimeout(timeout);
          delete this.pendingConnection;
          console.error('WebSocket error:', event);
          reject(new Error('WebSocket connection failed'));
        };

        this.ws.onmessage = (event) => {
          this.resolve(event);
        };
      } catch (error) {
        delete this.pendingConnection;
        reject(error);
      }
    });

    return this.pendingConnection;
  }

  /**
   * Handles WebSocket connection close events.
   */
  private handleClose(event: CloseEvent): void {
    // Reject all pending calls
    this.pendingCalls.forEach((call) => {
      call.reject(new Error('WebSocket connection closed'));
    });
    this.pendingCalls.clear();

    // Attempt reconnection if enabled and connection wasn't closed intentionally
    if (
      this.config.autoReconnect !== false &&
      !event.wasClean &&
      this.reconnectAttempts < (this.config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS)
    ) {
      this.scheduleReconnect();
    }
  }

  /**
   * Schedules a reconnection attempt.
   */
  private scheduleReconnect(): void {
    if (this.isReconnecting) return;

    this.isReconnecting = true;
    const delay = this.config.reconnectDelay ?? DEFAULT_RECONNECT_DELAY;

    setTimeout(async () => {
      try {
        this.reconnectAttempts++;
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
        if (
          this.config.autoReconnect !== false &&
          this.reconnectAttempts < (this.config.maxReconnectAttempts ?? DEFAULT_MAX_RECONNECT_ATTEMPTS)
        ) {
          this.isReconnecting = false;
          this.scheduleReconnect();
        } else {
          this.isReconnecting = false;
        }
      }
    }, delay);
  }

  /**
   * Handles incoming WebSocket messages.
   * Routes responses back to pending calls.
   */
  protected resolve(event: MessageEvent): void {
    try {
      const response: IRPCResponse = JSON.parse(event.data);
      const call = this.pendingCalls.get(response.id);

      if (!call) {
        console.warn('Received response for unknown call:', response.id);
        return;
      }

      // Let base class handle the resolution
      if (response.error) {
        call.reject(new Error(response.error.message));
      } else {
        call.resolve(response.result as IRPCData);
      }

      this.pendingCalls.delete(response.id);
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  /**
   * Dispatches RPC calls over WebSocket.
   * Batches all calls into a single WebSocket message.
   */
  protected async dispatch(calls: IRPCCall[]): Promise<void> {
    // Reject calls if connection is closing or intentionally closed
    if (
      this.state === WebSocketState.CLOSING ||
      (this.state === WebSocketState.CLOSED && this.config.autoReconnect === false)
    ) {
      calls.forEach((call) => {
        call.reject(new Error(ERROR_MESSAGE[ERROR_CODE.INVALID_STATE]), false);
      });

      return;
    }

    // Wait for existing connection attempt
    if (this.state === WebSocketState.CONNECTING) {
      try {
        await this.pendingConnection;
      } catch (error) {
        calls.forEach((call) => {
          call.reject(error as Error);
        });

        return;
      }
    }

    // Establish connection if closed
    if (!this.isOpen) {
      try {
        await this.connect();
      } catch (error) {
        calls.forEach((call) => {
          call.reject(error as Error);
        });
        return;
      }
    }

    // Batch all calls into single WebSocket message
    const requests: IRPCRequest[] = calls.map(({ id, payload: { name, args } }) => ({ id, name, args }));

    try {
      this.ws!.send(JSON.stringify(requests));

      // Store pending calls for response handling
      calls.forEach((call) => {
        this.pendingCalls.set(call.id, call);
      });
    } catch (error) {
      calls.forEach((call) => {
        call.reject(error as Error);
      });
    }
  }

  /**
   * Closes the WebSocket connection.
   */
  public close(): void {
    if (this.ws) {
      this.config.autoReconnect = false;
      this.ws.close();
      this.ws = undefined;
    }
  }

  /**
   * Forces a reconnection.
   */
  public async reconnect(): Promise<void> {
    this.close();
    this.reconnectAttempts = 0;
    await this.connect();
  }
}
