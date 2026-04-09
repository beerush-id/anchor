import {
  ERROR_CODE,
  ERROR_MESSAGE,
  IRPC_PACKET_TYPE,
  IRPC_STATUS,
  type IRPCCall,
  type IRPCData,
  type IRPCPacketStream,
  type IRPCRequest,
  IRPCTransport,
  type TransportConfig,
} from '@irpclib/irpc';

export const DEFAULT_ENDPOINT = '/irpc';

/**
 * Configuration interface for HTTP transport.
 * Extends the base TransportConfig with HTTP-specific options.
 */
export type HTTPTransportConfig = TransportConfig & {
  /**
   * The base URL for all HTTP requests.
   * Optional parameter that defines the root URL for API endpoints.
   */
  baseURL?: string;

  /**
   * The specific endpoint path for RPC calls.
   * Defaults to '/irpc' if not provided.
   */
  endpoint?: string;

  /**
   * Custom headers to be included in every HTTP request.
   * Allows setting authentication tokens, content types, etc.
   */
  headers?: Record<string, string>;
};

/**
 * HTTP transport implementation for iRPC communication.
 * Handles sending RPC calls over HTTP and processing streaming responses.
 */
export class HTTPTransport extends IRPCTransport {
  /**
   * Gets the endpoint path for RPC calls.
   * Returns the configured endpoint or defaults to '/irpc'.
   */
  public get endpoint() {
    return this.config.endpoint ?? DEFAULT_ENDPOINT;
  }

  /**
   * Constructs the full URL for HTTP requests.
   * Combines the baseURL and endpoint to create a complete URL.
   */
  public get url() {
    return new URL(this.endpoint, this.config.baseURL);
  }

  /**
   * Creates a new HTTP transport instance.
   * @param config - The configuration for this transport instance.
   */
  constructor(public config: HTTPTransportConfig) {
    super(config);
  }

  /**
   * Dispatches RPC calls over HTTP.
   * Sends all pending calls in a single HTTP POST request.
   * @param calls - Array of RPC calls to dispatch.
   */
  protected async dispatch(calls: IRPCCall[]) {
    try {
      const requests: IRPCRequest[] = calls.map(({ id, payload: { name, args } }) => ({ id, name, args }));
      const maxTimeout =
        calls.reduce((acc, req) => Math.max(acc, req.options?.timeout ?? 0), 0) || this.config?.timeout;
      const controller = new AbortController();

      let breaker: number | undefined;

      if (maxTimeout) {
        breaker = setTimeout(() => {
          controller.abort(new Error(ERROR_MESSAGE[ERROR_CODE.TIMEOUT]));
        }, maxTimeout) as never;
      }

      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
        },
        body: JSON.stringify(requests),
        signal: controller.signal,
      });

      clearTimeout(breaker);

      if (!response?.ok) {
        calls.forEach((call) => {
          call.enqueue({
            id: call.id,
            name: call.payload.name,
            type: IRPC_PACKET_TYPE.CLOSE,
            status: IRPC_STATUS.ERROR,
            error: { code: ERROR_CODE.UNKNOWN, message: response?.statusText ?? 'Request failed.' },
            createdAt: Date.now(),
          } as IRPCPacketStream<IRPCData>);
        });
        return;
      }

      await this.resolveAll(calls, response);
    } catch (error) {
      calls.forEach((call) => {
        call.enqueue({
          id: call.id,
          name: call.payload.name,
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: { code: ERROR_CODE.UNKNOWN, message: (error as Error).message },
          createdAt: Date.now(),
        } as IRPCPacketStream<IRPCData>);
      });
    }
  }

  /**
   * Processes all responses from the HTTP response stream.
   * Reads the response body as a stream and resolves individual calls.
   * @param calls - Array of pending RPC calls.
   * @param response - The HTTP response object.
   */
  protected async resolveAll(calls: IRPCCall[], response: Response) {
    const reader = response.body?.getReader?.();

    if (!reader) {
      calls.forEach((call) => {
        call.enqueue({
          id: call.id,
          name: call.payload.name,
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: { code: ERROR_CODE.UNKNOWN, message: 'Invalid response body.' },
          createdAt: Date.now(),
        } as IRPCPacketStream<IRPCData>);
      });
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n');

          buffer = parts.pop() || '';

          for (const part of parts) {
            if (!part.trim()) continue;

            try {
              const packet: IRPCPacketStream<IRPCData> = JSON.parse(part);
              const call = calls.find((call) => call.id === packet.id);

              if (call) {
                call.enqueue(packet);
              }
            } catch (error) {
              console.error('Unable to parse response chunk:', part, error);
            }
          }
        }

        if (done) {
          if (buffer.trim()) {
            try {
              const packet: IRPCPacketStream<IRPCData> = JSON.parse(buffer);
              const call = calls.find((call) => call.id === packet.id);
              if (call) call.enqueue(packet);
            } catch (error) {
              console.error('Unable to parse final response chunk:', buffer, error);
            }
          }
          break;
        }
      }
    } catch (error) {
      console.error('Unable to read response stream:', error);
    } finally {
      reader.releaseLock();
    }
  }
}
