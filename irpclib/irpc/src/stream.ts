import { IRPC_PACKET_TYPE, IRPC_STATUS } from './enum.js';
import { ERROR_CODE } from './error.js';
import { RemoteState } from './state.js';
import type {
  IRPCData,
  IRPCError,
  IRPCPacketAnswer,
  IRPCPacketClose,
  IRPCPacketEvent,
  IRPCPacketStream,
  IRPCResponse,
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

  /**
   * Initializes a stream wrapping an asynchronous RPC execution.
   * 
   * @param id - The unique identifier of the RPC request.
   * @param name - The name of the specification processing the execution.
   * @param initializer - An execution callback that yields an IRPCResponse.
   */
  constructor(
    private id: string,
    private name: string,
    private initializer: () => Promise<IRPCResponse>
  ) {}

  /**
   * Evaluates the underlying initializer and propagates standard transport packets 
   * to all bound pipe handlers based on the output lifecycle.
   */
  private async start() {
    if (this.status !== IRPC_STATUS.IDLE) return;

    this.status = IRPC_STATUS.PENDING;
    const { id, name } = this;

    try {
      const response = await this.initializer();
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
          } satisfies IRPCPacketAnswer<T>;

          this.pipeHandlers.forEach((handler) => handler(packet));
          this.errorHandlers.forEach((handler) => handler(this.error!));
          this.closeHandlers.forEach((handler) => handler());

          return;
        }

        this.pipeHandlers.forEach((handler) => {
          handler({
            id,
            name,
            type: IRPC_PACKET_TYPE.ANSWER,
            data: result.data,
            status: result.status,
          } satisfies IRPCPacketAnswer<T>);
        });

        const unsubscribe = result.subscribe((state, event) => {
          if (event.type === 'init') return;

          const [rootKey] = event.keys;

          if (rootKey === 'data') {
            this.pipeHandlers.forEach((handler) => {
              handler({
                id,
                name,
                type: IRPC_PACKET_TYPE.EVENT,
                status: state.status,
                data: event,
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
              } satisfies IRPCPacketClose);
            });

            this.closeHandlers.forEach((handler) => handler());
            unsubscribe();
          }
        });
      } else {
        this.value = result as T;
        this.status = IRPC_STATUS.SUCCESS;

        const packet = {
          id,
          name,
          type: IRPC_PACKET_TYPE.ANSWER,
          status: IRPC_STATUS.SUCCESS,
          data: this.value as T,
        } satisfies IRPCPacketAnswer<T>;

        this.pipeHandlers.forEach((handler) => handler(packet));
        this.closeHandlers.forEach((handler) => handler());
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
        });
      });

      this.errorHandlers.forEach((handler) => handler(this.error!));
      this.closeHandlers.forEach((handler) => handler());

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
      } satisfies IRPCPacketAnswer<T>);

      return;
    }

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

    this.closeHandlers.add(handler);
    this.start().catch(() => {});
  }
}
