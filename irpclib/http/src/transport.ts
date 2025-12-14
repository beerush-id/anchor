import {
  ERROR_CODE,
  ERROR_MESSAGE,
  type IRPCCall,
  type IRPCRequest,
  type IRPCResponse,
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
      const maxTimeout = calls.reduce((acc, req) => Math.max(acc, req.timeout ?? 0), 0) || this.config?.timeout;
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
          call.reject(new Error(response?.statusText ?? 'Request failed.'));
        });
        return;
      }

      await this.resolveAll(calls, response);
    } catch (error) {
      calls.forEach((call) => {
        call.reject(error as Error);
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
        call.reject(new Error('Invalid response body.'));
      });
      return;
    }

    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();

        // Exit loop when stream is finished
        if (done) break;

        // Decode the chunk into text
        const chunk = decoder.decode(value);

        try {
          // Parse the JSON response
          const data: IRPCResponse = JSON.parse(chunk);

          // Find the corresponding call by ID
          const call = calls.find((call) => call.id === data.id);

          // Skip if no matching call found
          if (!call) {
            continue;
          }

          // Resolve the individual call
          this.resolve(call, data);
        } catch (error) {
          // Log parsing errors but continue processing
          console.error('Unable to parse response chunk:', chunk, error);
        }
      }
    } catch (error) {
      // Log stream reading errors
      console.error('Unable to read response stream:', error);
    } finally {
      // Always release the reader lock
      reader.releaseLock();
    }
  }

  /**
   * Resolves or rejects an individual RPC call based on the response.
   * @param call - The RPC call to resolve.
   * @param data - The response data for this call.
   */
  protected resolve(call: IRPCCall, data: IRPCResponse) {
    // Reject the call if there was an error
    if (data.error) {
      call.reject(new Error(data.error.message));
    } else {
      // Resolve the call with the result data
      call.resolve(data.result);
    }
  }
}
