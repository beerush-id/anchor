import {
  createContext,
  decode,
  IRPC_BASE_CONTEXT,
  IRPC_FILE_STATUS,
  type IRPCData,
  type IRPCFilePointer,
  type IRPCPackage,
  type IRPCRequest,
  IRPCResolver,
  IRPCRouter,
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
 * Custom response builder to override default response creation
 */
export type HTTPResponseBuilder = (body: BodyInit, init: ResponseInit) => Response | Promise<Response>;

/**
 * HTTP router that handles IRPC requests over HTTP transport
 */
export class HTTPRouter extends IRPCRouter {
  /** Configuration for the HTTP resolver */
  public config: HTTPResolveConfig;

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
    super(module, transport);
    this.config = {
      endpoint: transport.endpoint,
      resolver: defaultResolver,
      ...config,
    };
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
        const promises = requests.map((resolver) => {
          const ctx = createContext<string | symbol, unknown>([
            [IRPC_BASE_CONTEXT.ABORT_SIGNAL, abortController.signal],
            [IRPC_BASE_CONTEXT.ABORT_CONTROLLER, abortController],
            ...initContext,
          ]);

          return withContext(ctx, async () => {
            const error = await this.resolveMiddleware(resolver.req);

            if (error) {
              if (abortController.signal.aborted) return;
              controller.enqueue(encoder.encode(`${JSON.stringify(error)}\n`));
              return;
            }

            const stream = new IRPCStream(
              resolver.req.id,
              resolver.req.name,
              () => resolver.resolve(),
              resolver.spec,
              this
            );

            stream.pipe((packet) => {
              controller.enqueue(encoder.encode(`${JSON.stringify(packet)}\n`));
            });

            await new Promise<void>((resolve) => {
              let abortTimer: ReturnType<typeof setTimeout>;

              if (resolver.spec?.ttl) {
                abortTimer = setTimeout(() => {
                  abortController.abort();
                  resolve();
                }, resolver.spec.ttl);
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
}
