import { createContext, type IRPCPackage, type IRPCRequest, IRPCResolver, withContext } from '@irpclib/irpc';
import type { HTTPTransport } from './transport.js';

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
 * Configuration options for the HTTP resolver
 */
export type HTTPResolveConfig = {
  /** The endpoint URL for the HTTP transport */
  endpoint: string;
  /** Custom resolver function to handle requests */
  resolver: typeof defaultResolver;
};

/**
 * Middleware function that can process HTTP requests
 */
export type HTTPMiddleware = (req: Request) => void | Promise<void>;

/**
 * HTTP router that handles IRPC requests over HTTP transport
 */
export class HTTPRouter {
  /** Configuration for the HTTP resolver */
  public config: HTTPResolveConfig;
  /** Array of middleware functions to be executed */
  public middlewares: HTTPMiddleware[] = [];

  /**
   * Creates a new HTTPResolver instance
   * @param module - The IRPC package module to resolve requests against
   * @param transport - The HTTP transport mechanism
   * @param config - Optional configuration overrides
   */
  constructor(
    public module: IRPCPackage,
    public transport: HTTPTransport,
    config: Partial<HTTPResolveConfig> = {}
  ) {
    this.config = {
      endpoint: transport.endpoint,
      resolver: defaultResolver,
      ...config,
    };
  }

  /**
   * Adds a middleware function to the resolver
   * @param middleware - The middleware function to add
   * @returns The current HTTPResolver instance for chaining
   */
  public use(middleware: HTTPMiddleware) {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Resolves incoming HTTP requests
   * @param httpReq - The incoming HTTP request
   * @returns A Response object with the resolved data
   */
  public async resolve(httpReq: Request) {
    const requests = ((await httpReq.json()) as IRPCRequest[]).map((irpcReq) => {
      return this.config.resolver(irpcReq, this.module);
    });

    if (!requests.length) {
      return new Response(JSON.stringify([]), { status: 400 });
    }

    await Promise.all(this.middlewares.map((middleware) => middleware(httpReq)));

    const readable = new ReadableStream({
      start: (controller) => {
        const promises = requests.map((req) => {
          const ctx = createContext<string, unknown>([
            ['module', this.module],
            ['request', httpReq],
            ['headers', httpReq.headers],
          ]);

          return withContext(ctx, async () => {
            const response = await req.resolve();
            controller.enqueue(JSON.stringify(response));
          });
        });

        Promise.allSettled(promises).finally(() => {
          controller.close();
        });
      },
    });

    return new Response(readable, { status: 200 });
  }
}
