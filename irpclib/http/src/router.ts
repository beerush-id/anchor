import * as crypto from 'node:crypto';
import { replay } from '@anchorlib/core';
import {
  createContext,
  decode,
  ERROR_CODE,
  IRPC_BASE_CONTEXT,
  IRPC_FILE_STATUS,
  IRPC_PACKET_TYPE,
  IRPC_STATUS,
  type IRPCData,
  type IRPCFilePointer,
  type IRPCPackage,
  type IRPCPacketAnswer,
  type IRPCPacketEvent,
  type IRPCPacketStream,
  type IRPCRequest,
  IRPCResolver,
  IRPCRouter,
  IRPCStream,
  withContext,
  IRPC_STORE,
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
export type HTTPResponseBuilder = (body: BodyInit, init: ResponseInit) => Response;

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
   *
   * @param request - The incoming HTTP request
   * @param context - Optional context to initialize the resolver with
   * @param builder - Optional custom response builder function
   * @returns A Response object with the resolved data
   */
  public async resolve(request: Request, context: [string | symbol, unknown][] = [], builder?: HTTPResponseBuilder) {
    const buildResponse = (body: BodyInit, init: ResponseInit) => {
      if (builder) return builder(body, init);
      return new Response(body, init);
    };

    try {
      return this.resolveForm(await request.formData(), context, builder);
    } catch (error) {
      IRPC_STORE.error(error as Error, [{ method: request.method, url: request.url }]);
      return buildResponse(
        JSON.stringify({
          code: ERROR_CODE.UNKNOWN,
          message: (error as Error)?.message as string,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Resolves incoming HTTP requests with JSON payload
   *
   * @param req - The incoming HTTP request
   * @param name - The name of the RPC function to call
   * @param context - Optional context to initialize the resolver with
   * @param builder - Optional custom response builder function
   * @returns A Response object with the resolved data
   */
  public async resolveRest(
    req: Request,
    name: string,
    context: [string | symbol, unknown][] = [],
    builder?: HTTPResponseBuilder
  ) {
    const buildResponse = (body: BodyInit, init: ResponseInit) => {
      if (builder) return builder(body, init);
      return new Response(body, init);
    };

    try {
      return this.resolveJson(await req.json(), name, context, builder);
    } catch (error) {
      IRPC_STORE.error(error as Error, [{ name, method: req.method, url: req.url }]);
      return buildResponse(
        JSON.stringify({
          code: ERROR_CODE.UNKNOWN,
          message: (error as Error)?.message as string,
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Resolves incoming HTTP requests with FormData
   *
   * @param body - The incoming HTTP request body
   * @param context - Optional context to initialize the resolver with
   * @param builder - Optional custom response builder function
   * @returns A Response object with the resolved data
   */
  public async resolveForm(body: FormData, context: [string | symbol, unknown][] = [], builder?: HTTPResponseBuilder) {
    const irpcRequests = JSON.parse(body.get(IRPC_JSON_KEY) as string) as (IRPCRequest & {
      files?: IRPCFilePointer[];
    })[];

    const requests = irpcRequests.map((req) => {
      if (req.files?.length) {
        const stream = decode({ data: req.args as IRPCData, files: req.files });

        for (const [id, file] of stream.files) {
          file.data = body.get(id) as File;
          file.status = IRPC_FILE_STATUS.SUCCESS;
        }

        req.args = stream.data as unknown[];
        delete req.files;
      }

      return this.config.resolver(req, this.module);
    });

    return this.resolveRequests(requests, context, builder);
  }

  /**
   * Resolves incoming HTTP requests with JSON payload
   *
   * @param req - The incoming HTTP request
   * @param name - The name of the RPC function to call
   * @param context - Optional context to initialize the resolver with
   * @param builder - Optional custom response builder function
   * @returns A Response object with the resolved data
   */
  public async resolveJson(
    req: unknown,
    name: string,
    context: [string | symbol, unknown][] = [],
    builder?: HTTPResponseBuilder
  ) {
    return this.resolveJsonReq({ name, id: crypto.randomUUID(), args: [req] }, context, builder);
  }

  /**
   * Resolves incoming HTTP requests with JSON payload
   *
   * @param req - The incoming HTTP request
   * @param context - Optional context to initialize the resolver with
   * @param builder - Optional custom response builder function
   * @returns A Response object with the resolved data
   */
  public async resolveJsonReq(
    req: IRPCRequest,
    context: [string | symbol, unknown][] = [],
    builder?: HTTPResponseBuilder
  ) {
    const buildResponse = (body: BodyInit, init: ResponseInit) => {
      if (builder) return builder(body, init);
      return new Response(body, init);
    };

    try {
      const result = {} as IRPCPacketStream<IRPCData>;
      const response = this.resolveRequests([this.config.resolver(req, this.module)], context, builder);
      const packets = (await response.text())
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as IRPCPacketStream<IRPCData>);

      for (const packet of packets) {
        if (packet.type === IRPC_PACKET_TYPE.EVENT) {
          replay.any(result, (packet as IRPCPacketEvent).data);
          continue;
        }

        Object.assign(result, packet);
      }

      if (result.status === IRPC_STATUS.ERROR) {
        const { error } = result as IRPCPacketAnswer<IRPCData>;
        return buildResponse(JSON.stringify(error), {
          status: error?.code === ERROR_CODE.NOT_FOUND ? 404 : 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return buildResponse(JSON.stringify((result as IRPCPacketAnswer<IRPCData>).data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      IRPC_STORE.error(error as Error, [{ id: req.id, name: req.name }]);
      return buildResponse(
        JSON.stringify({
          code: ERROR_CODE.UNKNOWN,
          message: (error as Error)?.message as string,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  /**
   * Resolves incoming HTTP requests
   *
   * @param resolvers - The incoming HTTP request resolvers
   * @param initContext - Optional context to initialize the resolver with
   * @param builder - Optional custom response builder function
   * @returns A Response object with the resolved data
   */
  private resolveRequests(
    resolvers: IRPCResolver[],
    initContext: [string | symbol, unknown][] = [],
    builder?: HTTPResponseBuilder
  ): Response {
    const buildResponse = (body: BodyInit, init: ResponseInit) => {
      if (builder) return builder(body, init);
      return new Response(body, init);
    };

    if (!resolvers.length) {
      return buildResponse(JSON.stringify([]), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    const encoder = new TextEncoder();
    const abortController = new AbortController();

    const readable = new ReadableStream({
      start: (controller) => {
        const promises = resolvers.map((resolver) => {
          const ctx = createContext<string | symbol, unknown>([
            [IRPC_BASE_CONTEXT.ABORT_SIGNAL, abortController.signal],
            [IRPC_BASE_CONTEXT.ABORT_CONTROLLER, abortController],
            ...initContext,
          ]);

          return withContext(ctx, async () => {
            const error = await this.resolveHooks(resolver.req);

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
