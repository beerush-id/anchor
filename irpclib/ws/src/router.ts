import {
  createContext,
  ERROR_CODE,
  ERROR_MESSAGE,
  type IRPCPackage,
  type IRPCRequest,
  IRPCResolver,
  IRPCStream,
  IRPC_PACKET_TYPE,
  IRPC_STATUS,
  withContext,
} from '@irpclib/irpc';
import type { WebSocketTransport } from './transport.js';

/**
 * Default resolver function that creates an IRPCResolver instance
 * @param req - The incoming IRPC request
 * @param module - The IRPC package module
 * @returns A new IRPCResolver instance
 */
const defaultResolver = (req: IRPCRequest, module: IRPCPackage) => {
  return new IRPCResolver(req, module);
};

/**
 * Configuration options for WebSocket resolver
 */
export type WebSocketResolveConfig = {
  /** The WebSocket endpoint for connections */
  endpoint: string;
  /** Custom resolver function to handle requests */
  resolver: typeof defaultResolver;
};

/**
 * Middleware function that can process WebSocket messages
 */
export type WebSocketMiddleware = () => void | Promise<void>;

/**
 * WebSocket router that handles IRPC requests over WebSocket transport
 */
export class WebSocketRouter {
  /** Configuration for WebSocket resolver */
  public config: WebSocketResolveConfig;
  /** Array of middleware functions to be executed */
  public middlewares: WebSocketMiddleware[] = [];

  /**
   * Gets the WebSocket endpoint for connections
   * Returns the configured endpoint from transport
   */
  public get endpoint(): string {
    return this.config.endpoint;
  }

  /**
   * Creates a new WebSocketRouter instance
   * @param module - The IRPC package module to resolve requests against
   * @param transport - The WebSocket transport mechanism
   * @param config - Optional configuration overrides
   */
  constructor(
    public module: IRPCPackage,
    public transport: WebSocketTransport,
    config: Partial<WebSocketResolveConfig> = {}
  ) {
    this.config = {
      endpoint: transport.endpoint,
      resolver: defaultResolver,
      ...config,
    };
  }

  /**
   * Adds a middleware function to the router
   * @param middleware - The middleware function to add
   * @returns The current WebSocketRouter instance for chaining
   */
  public use(middleware: WebSocketMiddleware) {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Resolves incoming WebSocket messages
   * @param message - The incoming WebSocket message
   * @param ws - The WebSocket connection instance
   * @param request - The original WebSocket upgrade request (if available)
   * @returns void (responses are sent via WebSocket)
   */
  public async resolve(message: string, ws: WebSocket, request?: Request): Promise<void> {
    const irpcRequests = this.parseRequests(message);
    const requests = irpcRequests.map((irpcReq) => {
      return this.config.resolver(irpcReq, this.module);
    });

    if (!requests.length) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify([]));
      }
      return;
    }

    await Promise.all(
      requests.map((req) => {
        const ctx = createContext<string, unknown>([
          ['request', request],
          ['websocket', ws],
          ['headers', request?.headers],
        ]);

        return withContext(ctx, async () => {
          const error = await this.resolveMiddleware(req.req);

          if (error) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(error));
            }
            return;
          }

          const stream = new IRPCStream(req.req.id, req.req.name, () => req.resolve());

          stream.pipe((packet) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(packet));
            }
          });

          await new Promise<void>((resolve) => {
            stream.close(resolve);
          });
        });
      })
    );
  }

  /**
   * Resolves middleware functions for a given request
   * @param req - The IRPC request to process middleware for
   * @returns An error response if middleware fails, undefined otherwise
   */
  protected async resolveMiddleware(req: IRPCRequest) {
    for (const middleware of this.middlewares) {
      if (typeof middleware === 'function') {
        try {
          await middleware();
        } catch (error) {
          console.error(error);

          return {
            id: req.id,
            name: req.name,
            type: IRPC_PACKET_TYPE.CLOSE,
            status: IRPC_STATUS.ERROR,
            error: {
              code: ERROR_CODE.UNKNOWN,
              message: ERROR_MESSAGE[ERROR_CODE.UNKNOWN],
            },
            createdAt: Date.now(),
          };
        }
      }
    }
  }

  /**
   * Parses incoming WebSocket message and returns array of IRPC requests.
   * Returns empty array if parsing fails (fail-safe).
   * @param message - The incoming WebSocket message string
   * @returns Array of IRPC requests, or empty array on error
   */
  private parseRequests(message: string): IRPCRequest[] {
    try {
      const parsed = JSON.parse(message);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
      return [];
    }
  }
}
