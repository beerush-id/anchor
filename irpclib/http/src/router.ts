import { COOKIE_JAR_WRITABLE, decodeCookies, replay, setCookieContext, setScope } from '@airlib/core';
import {
  createContextStore,
  createCredentials,
  decode,
  IRPC_BASE_CONTEXT,
  IRPC_FILE_STATUS,
  IRPC_PACKET_TYPE,
  IRPC_STATUS,
  IRPC_STORE,
  type IRPCData,
  type IRPCPackage,
  type IRPCPacketAnswer,
  type IRPCPacketEvent,
  type IRPCPacketStream,
  type IRPCRequest,
  type IRPCRequests,
  IRPCResolver,
  IRPCRouter,
  IRPCStream,
  IRPCTransport,
  RESOLVE_ERROR,
  ResolveError,
  withContext,
} from '@irpclib/irpc';
import { IRPC_DEFAULT_HEARTBEAT, IRPC_JSON_KEY, IRPC_WEB_PATH } from './enum.js';
import { COOKIES_SYNC_KEY, type HTTPTransport } from './transport.js';

/**
 * Default resolver function that creates an IRPCResolver instance
 * @param req - The incoming IRPC request
 * @param module - The IRPC package module
 * @returns A new IRPCResolver instance
 */
const defaultResolver = (req: IRPCRequest, module?: IRPCPackage) => {
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
  /** Interval in ms that emits a no-op frame on open streams, so runtimes that kill idle requests keep them alive. Set to 0 to disable. Defaults to 15000. */
  heartbeat?: number;
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

  public get module() {
    return this.transport.packages.values().next().value;
  }

  /**
   * Creates a new HTTP router with the specified transport and configuration.
   *
   * @param transport - The IRPCTransport instance to use.
   * @param config - The configuration options for the HTTP resolver.
   */
  constructor(transport: HTTPTransport, config?: Partial<HTTPResolveConfig>);

  /**
   * @deprecated Only for backwards compatibility.
   * Creates a new HTTP router with the specified module, transport, and configuration.
   *
   * @param module - The IRPC package module.
   * @param transport - The IRPCTransport instance to use.
   * @param config - The configuration options for the HTTP resolver.
   */
  constructor(module: IRPCPackage, transport: HTTPTransport, config?: Partial<HTTPResolveConfig>);

  constructor(
    module: IRPCPackage | HTTPTransport,
    transport: HTTPTransport | Partial<HTTPResolveConfig> = {},
    config: Partial<HTTPResolveConfig> = {}
  ) {
    if (module instanceof IRPCTransport) {
      super(module);
      config = transport;
    } else {
      super(module, transport as IRPCTransport);
    }

    this.config = {
      endpoint: (this.transport as HTTPTransport).endpoint,
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

    const [, suffix] = request.url.split(this.config.endpoint);

    try {
      if (suffix?.startsWith(IRPC_WEB_PATH)) {
        return await this.resolveBuffered(request, context, builder);
      }

      const jar = decodeCookies(request.headers.get('cookie') ?? '');
      return await this.resolveForm(await request.formData(), context, builder, jar, request.signal);
    } catch (error) {
      IRPC_STORE.error(error as Error, [{ method: request.method, url: request.url }]);
      return buildResponse(JSON.stringify(ResolveError.failed(error as Error).json()), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
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
      return buildResponse(JSON.stringify(ResolveError.failed(error as Error).json()), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Resolves incoming HTTP requests with FormData
   *
   * @param body - The incoming HTTP request body
   * @param context - Optional context to initialize the resolver with
   * @param builder - Optional custom response builder function
   * @param jar - Optional decoded cookie jar
   * @param signal - Optional request signal that aborts the stream when the client disconnects
   * @returns A Response object with the resolved data
   */
  public async resolveForm(
    body: FormData,
    context: [string | symbol, unknown][] = [],
    builder?: HTTPResponseBuilder,
    jar?: ReturnType<typeof decodeCookies>,
    signal?: AbortSignal
  ) {
    const irpcRequests = JSON.parse(body.get(IRPC_JSON_KEY) as string) as IRPCRequests;

    const requests = irpcRequests.calls.map((req) => {
      if (req.files?.length) {
        const stream = decode({ data: req.args as IRPCData, files: req.files });

        for (const [id, file] of stream.files) {
          file.data = body.get(id) as File;
          file.status = IRPC_FILE_STATUS.SUCCESS;
        }

        req.args = stream.data as unknown[];
        delete req.files;
      }

      return this.config.resolver(req, this.packageOf(req));
    });

    const credStore = createCredentials(irpcRequests.credentials ?? []);
    return this.resolveRequests(
      requests,
      [...context, [IRPC_BASE_CONTEXT.CREDENTIALS, credStore]],
      builder,
      jar,
      signal
    );
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
    const [methodName, pkgName, pkgVersion] = name.split('/');
    const pkgPayload = pkgName && pkgVersion ? { name: pkgName, version: pkgVersion } : undefined;

    return this.resolveJsonReq(
      { name: methodName, id: crypto.randomUUID(), args: [req], package: pkgPayload as any },
      context,
      builder
    );
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
      const response = this.resolveRequests([this.config.resolver(req, this.packageOf(req))], context, builder);
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
          status: error?.code === RESOLVE_ERROR.NOT_FOUND ? 404 : 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return buildResponse(JSON.stringify((result as IRPCPacketAnswer<IRPCData>).data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      IRPC_STORE.error(error as Error, [{ id: req.id, name: req.name }]);
      return buildResponse(JSON.stringify(ResolveError.failed(error as Error).json()), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Resolves incoming HTTP requests
   *
   * @param resolvers - The incoming HTTP request resolvers
   * @param initContext - Optional context to initialize the resolver with
   * @param builder - Optional custom response builder function
   * @param jar - Optional decoded cookie jar
   * @param signal - Optional request signal that aborts the stream when the client disconnects
   * @returns A Response object with the resolved data
   */
  private resolveRequests(
    resolvers: IRPCResolver[],
    initContext: [string | symbol, unknown][] = [],
    builder?: HTTPResponseBuilder,
    jar?: ReturnType<typeof decodeCookies>,
    signal?: AbortSignal
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

    const onDisconnect = () => abortController.abort(signal?.reason);

    if (signal) {
      if (signal.aborted) onDisconnect();
      else signal.addEventListener('abort', onDisconnect, { once: true });
    }

    let heartbeatTimer: ReturnType<typeof setInterval>;
    const heartbeat = this.config.heartbeat ?? IRPC_DEFAULT_HEARTBEAT;

    const readable = new ReadableStream({
      start: (controller) => {
        if (heartbeat) {
          const frame = encoder.encode('\n');

          heartbeatTimer = setInterval(() => {
            try {
              controller.enqueue(frame);
            } catch {
              clearInterval(heartbeatTimer);
            }
          }, heartbeat);
        }

        const promises = resolvers.map((resolver) => {
          const ctx = createContextStore<string | symbol, unknown>([
            [IRPC_BASE_CONTEXT.ABORT_SIGNAL, abortController.signal],
            [IRPC_BASE_CONTEXT.ABORT_CONTROLLER, abortController],
            ...initContext,
          ]);

          return withContext(ctx, async () => {
            if (jar) setCookieContext(jar);

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
          clearInterval(heartbeatTimer);
          signal?.removeEventListener('abort', onDisconnect);
          if (abortController.signal.aborted) return;
          controller.close();
        });
      },
      cancel: (reason) => {
        clearInterval(heartbeatTimer);
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
   * Resolves a standalone (one-shot) HTTP request.
   *
   * Decodes cookies from the request, resolves the call with a writable
   * cookie context, and returns a complete JSON response with Set-Cookie headers.
   *
   * @param request - The incoming HTTP request
   * @param context - Optional context to initialize the resolver with
   * @param builder - Optional custom response builder function
   * @returns A Response object with the resolved data and Set-Cookie headers
   */
  public async resolveBuffered(
    request: Request,
    context: [string | symbol, unknown][] = [],
    builder?: HTTPResponseBuilder
  ) {
    const buildResponse = (body: BodyInit, init: ResponseInit) => {
      if (builder) return builder(body, init);
      return new Response(body, init);
    };

    const jar = decodeCookies(request.headers.get('cookie') ?? '');
    const body = await request.formData();
    const irpcRequests = JSON.parse(body.get(IRPC_JSON_KEY) as string) as IRPCRequests;

    const req = irpcRequests.calls[0];

    if (req.files?.length) {
      const stream = decode({ data: req.args as IRPCData, files: req.files });

      for (const [id, file] of stream.files) {
        file.data = body.get(id) as File;
        file.status = IRPC_FILE_STATUS.SUCCESS;
      }

      req.args = stream.data as unknown[];
      delete req.files;
    }

    const resolver = this.config.resolver(req, this.packageOf(req));
    const credStore = createCredentials(irpcRequests.credentials ?? []);
    const abortController = new AbortController();

    const ctx = createContextStore<string | symbol, unknown>([
      [IRPC_BASE_CONTEXT.ABORT_SIGNAL, abortController.signal],
      [IRPC_BASE_CONTEXT.ABORT_CONTROLLER, abortController],
      [IRPC_BASE_CONTEXT.CREDENTIALS, credStore],
      ...context,
    ]);

    try {
      const result = await withContext(ctx, async () => {
        setCookieContext(jar);
        setScope(COOKIE_JAR_WRITABLE, true);

        const error = await this.resolveHooks(resolver.req);
        if (error) return { error, status: error.status };

        const stream = new IRPCStream(
          resolver.req.id,
          resolver.req.name,
          () => resolver.resolve(),
          resolver.spec,
          this
        );

        return new Promise<IRPCPacketStream<IRPCData>>((resolve) => {
          const result = {} as IRPCPacketStream<IRPCData>;

          stream.pipe((packet) => {
            if (packet.type === IRPC_PACKET_TYPE.EVENT) {
              replay.any(result, (packet as IRPCPacketEvent).data);
            } else {
              Object.assign(result, packet);
            }
          });

          stream.close(() => resolve(result));
        });
      });

      const headers = new Headers({ 'Content-Type': 'application/json' });

      for (const cookie of jar.encode()) {
        headers.append('Set-Cookie', cookie);
      }

      if (jar.changes.size) {
        headers.set(COOKIES_SYNC_KEY, '1');
      }

      const status =
        result.status === IRPC_STATUS.ERROR
          ? (result as IRPCPacketAnswer<IRPCData>).error?.code === RESOLVE_ERROR.NOT_FOUND
            ? 404
            : 500
          : 200;

      return buildResponse(JSON.stringify(result), { status, headers });
    } catch (error) {
      IRPC_STORE.error(error as Error, [{ id: req.id, name: req.name }]);
      return buildResponse(JSON.stringify(ResolveError.failed(error as Error).json()), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}
