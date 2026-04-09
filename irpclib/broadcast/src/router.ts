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
import type { BroadcastTransport } from './transport.js';

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
 * Configuration options for BroadcastChannel resolver
 */
export type BroadcastResolveConfig = {
  /** The BroadcastChannel endpoint for connections */
  endpoint: string;
  /** Custom resolver function to handle requests */
  resolver: typeof defaultResolver;
};

/**
 * Middleware function that can process BroadcastChannel messages
 */
export type BroadcastMiddleware = () => void | Promise<void>;

/**
 * BroadcastChannel router that handles IRPC requests over BroadcastChannel transport
 */
export class BroadcastRouter {
  /** Configuration for BroadcastChannel resolver */
  public config: BroadcastResolveConfig;
  /** Array of middleware functions to be executed */
  public middlewares: BroadcastMiddleware[] = [];
  /** BroadcastChannel instance for listening to requests */
  private channel?: BroadcastChannel;

  /**
   * Gets the BroadcastChannel endpoint for connections
   * Returns the configured endpoint from transport
   */
  public get endpoint(): string {
    return this.config.endpoint;
  }

  /**
   * Creates a new BroadcastRouter instance
   * @param module - The IRPC package module to resolve requests against
   * @param transport - The BroadcastChannel transport mechanism
   * @param config - Optional configuration overrides
   */
  constructor(
    public module: IRPCPackage,
    public transport: BroadcastTransport,
    config: Partial<BroadcastResolveConfig> = {}
  ) {
    this.config = {
      endpoint: transport.endpoint,
      resolver: defaultResolver,
      ...config,
    };

    // Set up channel listener for incoming requests
    this.setupChannel();
  }

  /**
   * Sets up the BroadcastChannel listener for incoming requests
   */
  private setupChannel(): void {
    this.channel = new BroadcastChannel(this.config.endpoint);
    this.channel.onmessage = (event) => {
      this.handleMessage(event);
    };
  }

  /**
   * Handles incoming BroadcastChannel messages
   */
  private async handleMessage(event: MessageEvent): Promise<void> {
    const data = event.data;

    // Only handle requests (arrays of IRPCRequest)
    if (!Array.isArray(data)) return;

    await this.resolve(data);
  }

  /**
   * Adds a middleware function to the router
   * @param middleware - The middleware function to add
   * @returns The current BroadcastRouter instance for chaining
   */
  public use(middleware: BroadcastMiddleware) {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Resolves incoming BroadcastChannel messages
   * @param requests - The incoming IRPC requests
   * @returns void (responses are sent via BroadcastChannel)
   */
  public async resolve(requests: IRPCRequest[]): Promise<void> {
    if (!requests.length) {
      return;
    }

    const resolvers = requests.map((irpcReq) => {
      return this.config.resolver(irpcReq, this.module);
    });

    await Promise.all(
      resolvers.map((resolver) => {
        const ctx = createContext<string, unknown>([
          ['channel', this.channel],
          ['endpoint', this.config.endpoint],
        ]);

        return withContext(ctx, async () => {
          const error = await this.resolveMiddleware(resolver.req);

          if (error) {
            if (this.channel) {
              this.channel.postMessage(error);
            }
            return;
          }

          const stream = new IRPCStream(resolver.req.id, resolver.req.name, () => resolver.resolve());

          stream.pipe((packet) => {
            if (this.channel) {
              this.channel.postMessage(packet);
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
   * Closes the router and cleans up the BroadcastChannel
   */
  public close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = undefined;
    }
  }
}
