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
import { FILE_BUFFER_TTL, WS_MESSAGE_TYPE } from './enum.js';
import { decodeFileFrame } from './frame.js';
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

export type WebSocketResolveConfig = {
  /** The WebSocket endpoint for connections */
  endpoint: string;
  /** Custom resolver function to handle requests */
  resolver: typeof defaultResolver;
  /** TTL in ms for buffered binary data before auto-cleanup. Defaults to 30s. */
  fileBufferTTL: number;
};

/**
 * WebSocket router that handles IRPC requests over WebSocket transport
 */
export class WebSocketRouter extends IRPCRouter {
  /** Configuration for WebSocket resolver */
  public config: WebSocketResolveConfig;
  /** AbortControllers for active stream requests */
  private abortControllers = new Map<string, AbortController>();
  /** Buffered binary data waiting for JSON requests, keyed by file pointer ID */
  private fileBuffer = new Map<string, Uint8Array>();

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
    super(module, transport);
    this.config = {
      endpoint: transport.endpoint,
      resolver: defaultResolver,
      fileBufferTTL: FILE_BUFFER_TTL,
      ...config,
    };
  }

  /**
   * Resolves incoming WebSocket messages
   * @param message - The incoming WebSocket message
   * @param ws - The WebSocket connection instance
   * @param initContext - Optional initial context entries to inject
   * @returns void (responses are sent via WebSocket)
   */
  public async resolve(
    message: string | ArrayBuffer,
    ws: WebSocket,
    initContext: [string | symbol, unknown][] = []
  ): Promise<void> {
    if (message instanceof ArrayBuffer) {
      const frame = decodeFileFrame(message);
      this.fileBuffer.set(frame.id, frame.data);
      setTimeout(() => this.fileBuffer.delete(frame.id), this.config.fileBufferTTL);
      return;
    }

    const irpcRequests = this.parseRequests(message).filter(
      (req: IRPCRequest & { type?: string; files?: IRPCFilePointer[] }) => {
        if (req.type === WS_MESSAGE_TYPE.CANCEL) {
          const controller = this.abortControllers.get(req.id);
          if (controller) controller.abort();

          this.abortControllers.delete(req.id);
          return false;
        }

        if (req.files?.length) {
          const stream = decode({ data: req.args as IRPCData, files: req.files });

          for (const [id, file] of stream.files) {
            const buffered = this.fileBuffer.get(id);

            if (buffered) {
              file.data = new Blob([buffered] as [BlobPart], { type: file.meta.type });
              file.status = IRPC_FILE_STATUS.SUCCESS;
              this.fileBuffer.delete(id);
            }
          }

          req.args = stream.data as unknown[];
          delete req.files;
        }

        return true;
      }
    );

    if (!irpcRequests.length) return;

    const requests = irpcRequests.map((irpcReq) => {
      return this.config.resolver(irpcReq, this.module);
    });

    await Promise.all(
      requests.map((resolver) => {
        const abortController = new AbortController();
        const ctx = createContext<string | symbol, unknown>([
          [IRPC_BASE_CONTEXT.ABORT_SIGNAL, abortController.signal],
          [IRPC_BASE_CONTEXT.ABORT_CONTROLLER, abortController],
          ...initContext,
        ]);

        this.abortControllers.set(resolver.req.id, abortController);

        return withContext(ctx, async () => {
          const error = await this.resolveHooks(resolver.req);

          if (error) {
            this.abortControllers.delete(resolver.req.id);
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(error));
            }
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
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(packet));
            }
          });

          let ttlTimer: ReturnType<typeof setTimeout>;

          if (resolver.spec?.ttl) {
            ttlTimer = setTimeout(() => {
              abortController.abort();
            }, resolver.spec.ttl);
          }

          await new Promise<void>((resolve) => {
            stream.close(() => {
              clearTimeout(ttlTimer);
              this.abortControllers.delete(resolver.req.id);
              resolve();
            });
          });
        });
      })
    );
  }

  /**
   * Aborts all active stream controllers.
   * Call this on WebSocket disconnect to clean up all active streams.
   */
  public disconnect() {
    this.abortControllers.forEach((controller) => controller.abort());
    this.abortControllers.clear();
    this.fileBuffer.clear();
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
