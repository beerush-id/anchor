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

/**
 * Configuration interface for BroadcastChannel transport.
 * Extends the base TransportConfig with BroadcastChannel-specific options.
 */
export type BroadcastTransportConfig = TransportConfig & {
  /**
   * The channel name for BroadcastChannel communication.
   * This will be prefixed with 'irpc://' internally to avoid conflicts.
   */
  channel: string;
};

/**
 * BroadcastChannel transport implementation for IRPC communication.
 * Enables cross-context communication (tabs, windows, iframes, workers) using the BroadcastChannel API.
 * The same transport configuration works on both client and server sides.
 */
export class BroadcastTransport extends IRPCTransport {
  /**
   * The BroadcastChannel instance.
   */
  private channel?: BroadcastChannel;

  /**
   * Gets the channel name with irpc:// prefix.
   * Returns the namespaced channel name.
   */
  public get endpoint(): string {
    return `irpc://${this.config.channel}`;
  }

  /**
   * Pending calls waiting for responses.
   */
  private pendingCalls = new Map<string, IRPCCall>();

  /**
   * Creates a new BroadcastChannel transport instance.
   * @param config - The configuration for this transport instance.
   */
  constructor(public config: BroadcastTransportConfig) {
    super(config);
    this.connect();
  }

  /**
   * Establishes a BroadcastChannel connection.
   */
  private connect(): void {
    if (this.channel) return;

    // Create channel with irpc:// prefix to avoid conflicts
    this.channel = new BroadcastChannel(this.endpoint);

    // Listen for incoming messages (both responses and requests for router)
    this.channel.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  /**
   * Handles incoming BroadcastChannel messages.
   * Determines if the message is a response or request and routes accordingly.
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = event.data;

      // Check if it's a response (has 'result' or 'error' field)
      if (this.isResponse(data)) {
        this.resolveResponse(data);
      }
      // Otherwise, it's a request that should be handled by the router
      // The router will set up its own message listener
    } catch (error) {
      console.error('Failed to handle BroadcastChannel message:', error);
    }
  }

  /**
   * Checks if the data is an IRPC response.
   */
  private isResponse(data: any): data is IRPCResponse {
    return data && typeof data === 'object' && ('result' in data || 'error' in data);
  }

  /**
   * Resolves a response message.
   * Routes responses back to pending calls.
   */
  private resolveResponse(response: IRPCResponse): void {
    const call = this.pendingCalls.get(response.id);

    if (!call) {
      console.warn('Received response for unknown call:', response.id);
      return;
    }

    // Resolve or reject the call
    if (response.error) {
      call.reject(new Error(response.error.message));
    } else {
      call.resolve(response.result as IRPCData);
    }

    this.pendingCalls.delete(response.id);
  }

  /**
   * Dispatches RPC calls over BroadcastChannel.
   * Batches all calls into a single BroadcastChannel message.
   */
  protected async dispatch(calls: IRPCCall[]): Promise<void> {
    if (!this.channel) {
      calls.forEach((call) => {
        call.reject(new Error(ERROR_MESSAGE[ERROR_CODE.INVALID_STATE]), false);
      });
      return;
    }

    // Batch all calls into single BroadcastChannel message
    const requests: IRPCRequest[] = calls.map(({ id, payload: { name, args } }) => ({ id, name, args }));

    try {
      this.channel.postMessage(requests);

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
   * Closes the BroadcastChannel connection.
   */
  public close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = undefined;
    }

    // Reject all pending calls
    this.pendingCalls.forEach((call) => {
      call.reject(new Error('BroadcastChannel connection closed'));
    });
    this.pendingCalls.clear();
  }
}
