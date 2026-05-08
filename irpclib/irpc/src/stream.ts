import { getAbortController, getAbortSignal } from './context.js';
import { IRPC_PACKET_TYPE, IRPC_STATUS } from './enum.js';
import { ERROR_CODE } from './error.js';
import type { IRPCRouter } from './router.js';
import { RemoteState } from './state.js';
import { IRPC_STORE } from './store.js';
import type {
  IRPCData,
  IRPCDataSchema,
  IRPCError,
  IRPCInputs,
  IRPCPacketAnswer,
  IRPCPacketClose,
  IRPCPacketEvent,
  IRPCPacketStream,
  IRPCResponse,
  IRPCSpec,
  IRPCStatus,
} from './types.js';

/**
 * A server-side producer that normalizes and serializes RPC outputs into standard transport packets.
 *
 * Supports both standard asynchronous responses and reactive streams. When handling a continuous stream,
 * it intercepts state mutations and emits sequential network packets (`ANSWER`, `EVENT`, `CLOSE`).
 *
 * @template T - The type of data yielded by the stream.
 */
export class IRPCStream<T extends IRPCData> {
  private pipeHandlers: Set<(event: IRPCPacketStream<T>) => void> = new Set();
  private closeHandlers: Set<() => void> = new Set();
  private errorHandlers: Set<(error: IRPCError) => void> = new Set();

  public value?: T;
  public error?: IRPCError;
  public status: IRPCStatus = IRPC_STATUS.IDLE;
  public closed = false;

  public createdAt = Date.now();
  public startedAt?: number;
  public updatedAt?: number;
  public controller?: AbortController;

  /**
   * Initializes a stream wrapping an asynchronous RPC execution.
   *
   * @param id - The unique identifier of the RPC request.
   * @param name - The name of the specification processing the execution.
   * @param initializer - An execution callback that yields an IRPCResponse.
   * @param spec - The specification for the RPC execution.
   * @param router - The router instance managing the stream.
   */
  constructor(
    private id: string,
    private name: string,
    private initializer: () => Promise<IRPCResponse>,
    public spec?: IRPCSpec<IRPCInputs, IRPCDataSchema>,
    public router?: IRPCRouter
  ) {
    IRPC_STORE.queue(this);
  }

  /**
   * Evaluates the underlying initializer and propagates standard transport packets
   * to all bound pipe handlers based on the output lifecycle.
   */
  private async start() {
    if (this.status !== IRPC_STATUS.IDLE || this.closed) return;

    this.startedAt = Date.now();
    this.controller = getAbortController();

    const abortSignal = getAbortSignal();

    if (abortSignal?.aborted) {
      this.finish();
      return;
    }

    this.status = IRPC_STATUS.PENDING;
    const { id, name } = this;

    try {
      const response = await this.initializer();

      if (abortSignal?.aborted) {
        this.finish();
        return;
      }

      const { result } = response;

      if (result instanceof RemoteState) {
        this.value = result.data;

        if (result.status === IRPC_STATUS.SUCCESS || result.status === IRPC_STATUS.ERROR) {
          if (result.status === IRPC_STATUS.ERROR) {
            this.error = { code: ERROR_CODE.STREAM_ERROR, message: result.error!.message };
            this.status = IRPC_STATUS.ERROR;
          } else {
            this.status = IRPC_STATUS.SUCCESS;
          }

          const packet = {
            id,
            name,
            type: IRPC_PACKET_TYPE.ANSWER,
            data: this.value as T,
            error: this.error,
            status: this.status,
            createdAt: Date.now(),
          } satisfies IRPCPacketAnswer<T>;

          this.pipeHandlers.forEach((handler) => handler(packet));

          if (this.error) {
            this.errorHandlers.forEach((handler) => handler(this.error!));
          }

          this.finish();
          return;
        }

        this.pipeHandlers.forEach((handler) => {
          handler({
            id,
            name,
            type: IRPC_PACKET_TYPE.ANSWER,
            data: result.data,
            status: result.status,
            createdAt: Date.now(),
          } satisfies IRPCPacketAnswer<T>);
        });

        const unsubscribe = result.subscribe((state, { type, keys, value }) => {
          if (type === 'init') return;

          const [rootKey] = keys;

          if (rootKey === 'data') {
            this.pipeHandlers.forEach((handler) => {
              handler({
                id,
                name,
                data: { type, keys, value },
                type: IRPC_PACKET_TYPE.EVENT,
                status: state.status,
                createdAt: Date.now(),
              } satisfies IRPCPacketEvent);
            });
          } else if (rootKey === 'status') {
            if (state.status !== IRPC_STATUS.SUCCESS && state.status !== IRPC_STATUS.ERROR) return;

            this.status = state.status;

            if (state.status === IRPC_STATUS.ERROR) {
              this.error = { code: ERROR_CODE.STREAM_ERROR, message: state.error!.message };
              this.errorHandlers.forEach((handler) => handler(this.error!));
            }

            this.pipeHandlers.forEach((handler) => {
              handler({
                id,
                name,
                type: IRPC_PACKET_TYPE.CLOSE,
                error: this.error,
                status: this.status,
                createdAt: Date.now(),
              } satisfies IRPCPacketClose);
            });

            abortSignal!.removeEventListener('abort', abortStream);

            this.finish();
            unsubscribe();
          }
        });

        const abortStream = () => {
          unsubscribe();
          this.finish();
        };

        abortSignal?.addEventListener('abort', abortStream, { once: true });
      } else {
        this.value = result as T;

        if (response.error) {
          this.error = { code: ERROR_CODE.STREAM_ERROR, message: response.error.message };
          this.status = IRPC_STATUS.ERROR;
          this.errorHandlers.forEach((handler) => handler(this.error!));
        } else {
          this.status = IRPC_STATUS.SUCCESS;
        }

        const packet = {
          id,
          name,
          type: IRPC_PACKET_TYPE.ANSWER,
          data: this.value as T,
          error: this.error,
          status: this.status,
          createdAt: Date.now(),
        } satisfies IRPCPacketAnswer<T>;

        this.pipeHandlers.forEach((handler) => handler(packet));
        this.finish();
      }
    } catch (error) {
      this.error = { code: ERROR_CODE.STREAM_ERROR, message: (error as Error).message };
      this.status = IRPC_STATUS.ERROR;

      this.pipeHandlers.forEach((handler) => {
        handler({
          id,
          name,
          type: IRPC_PACKET_TYPE.ANSWER,
          status: IRPC_STATUS.ERROR,
          error: error as IRPCError,
          createdAt: Date.now(),
        });
      });

      this.errorHandlers.forEach((handler) => handler(this.error!));
      this.finish();

      return;
    }
  }

  /**
   * Binds a handler to receive the outbound stream packets.
   * If invoked after the stream has fulfilled or rejected natively, it automatically plays back the conclusive packet.
   *
   * @param handler - A callback function to receive packets.
   */
  public pipe(handler: (event: IRPCPacketStream<T>) => void) {
    if (this.status === IRPC_STATUS.SUCCESS || this.status === IRPC_STATUS.ERROR) {
      handler({
        id: this.id,
        name: this.name,
        type: IRPC_PACKET_TYPE.ANSWER,
        data: this.value as T,
        error: this.error,
        status: this.status,
        createdAt: Date.now(),
      } satisfies IRPCPacketAnswer<T>);

      return;
    }

    if (this.closed) return;
    this.pipeHandlers.add(handler);
    this.start().catch(() => {});
  }

  /**
   * Binds a handler to trap any internal runtime failures independently.
   *
   * @param handler - A callback function to receive stream errors.
   */
  public catch(handler: (error: IRPCError) => void) {
    if (this.status === IRPC_STATUS.ERROR) {
      handler(this.error!);
      return;
    }

    if (this.closed) return;
    this.errorHandlers.add(handler);
    this.start().catch(() => {});
  }

  /**
   * Binds a handler triggered upon terminal completion of the stream process (success or error).
   *
   * @param handler - A callback function invoked at stream completion.
   */
  public close(handler: () => void) {
    if (this.status === IRPC_STATUS.SUCCESS || this.status === IRPC_STATUS.ERROR) {
      handler();
      return;
    }

    if (this.closed) return;
    this.closeHandlers.add(handler);
    this.start().catch(() => {});
  }

  private finish() {
    this.closed = true;
    this.closeHandlers.forEach((handler) => handler());

    this.pipeHandlers.clear();
    this.errorHandlers.clear();
    this.closeHandlers.clear();
    this.updatedAt = Date.now();

    IRPC_STORE.dequeue(this);
  }
}
