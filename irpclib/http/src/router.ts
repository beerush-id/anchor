import {
  createContext,
  decode,
  ERROR_CODE,
  ERROR_MESSAGE,
  IRPC_BASE_CONTEXT,
  IRPC_FILE_STATUS,
  IRPC_PACKET_TYPE,
  IRPC_STATUS,
  type IRPCData,
  type IRPCFilePointer,
  type IRPCPackage,
  type IRPCRequest,
  IRPCResolver,
  IRPCStream,
  withContext,
} from '@irpclib/irpc';
import { IRPC_JSON_KEY } from './enum.js';
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
export type HTTPMiddleware = () => void | Promise<void>;

/**
 * Custom response builder to override default response creation
 */
export type HTTPResponseBuilder = (body: BodyInit, init: ResponseInit) => Response | Promise<Response>;

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
   * @param initContext - Optional context to initialize the resolver with
   * @param builder - Optional custom response builder function
   * @returns A Response object with the resolved data
   */
  public async resolve(
    httpReq: Request,
    initContext: [string | symbol, unknown][] = [],
    builder?: HTTPResponseBuilder
  ) {
    const formData = await httpReq.formData();
    const irpcRequests = JSON.parse(formData.get(IRPC_JSON_KEY) as string) as (IRPCRequest & {
      files?: IRPCFilePointer[];
    })[];

    const requests = irpcRequests.map((req) => {
      if (req.files?.length) {
        const stream = decode({ data: req.args as IRPCData, files: req.files });

        for (const [id, file] of stream.files) {
          file.data = formData.get(id) as File;
          file.status = IRPC_FILE_STATUS.SUCCESS;
        }

        req.args = stream.data as unknown[];
        delete req.files;
      }

      return this.config.resolver(req, this.module);
    });

    const buildResponse = (body: BodyInit, init: ResponseInit) => {
      if (builder) return builder(body, init);
      return new Response(body, init);
    };

    if (!requests.length) {
      return buildResponse(JSON.stringify([]), { status: 400 });
    }

    const encoder = new TextEncoder();
    const abortController = new AbortController();

    const readable = new ReadableStream({
      start: (controller) => {
        const promises = requests.map((req) => {
          const ctx = createContext<string | symbol, unknown>([
            [IRPC_BASE_CONTEXT.ABORT_CONTROLLER, abortController.signal],
            ...initContext,
          ]);

          return withContext(ctx, async () => {
            const error = await this.resolveMiddleware(req.req);

            if (error) {
              if (abortController.signal.aborted) return;
              controller.enqueue(encoder.encode(`${JSON.stringify(error)}\n`));
              return;
            }

            const stream = new IRPCStream(req.req.id, req.req.name, () => req.resolve());

            stream.pipe((packet) => {
              controller.enqueue(encoder.encode(`${JSON.stringify(packet)}\n`));
            });

            await new Promise<void>((resolve) => {
              let abortTimer: ReturnType<typeof setTimeout>;

              if (req.spec?.ttl) {
                abortTimer = setTimeout(() => {
                  abortController.abort();
                  resolve();
                }, req.spec.ttl);
              }

              stream.close(() => {
                clearTimeout(abortTimer);
                resolve();
              });
            });
          });
        });

        Promise.allSettled(promises).finally(() => {
          if (abortController.signal.aborted) return;
          controller.close();
        });
      },
      cancel: (reason) => {
        abortController.abort(reason);
      },
    });

    return buildResponse(readable, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
      },
    });
  }

  /**
   * Resolves middleware functions for a given request
   * @param req - The IRPC request to process middleware for
   * @returns An error response if middleware fails, undefined otherwise
   */
  protected async resolveMiddleware(req: IRPCRequest) {
    for (const middleware of this.middlewares) {
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
