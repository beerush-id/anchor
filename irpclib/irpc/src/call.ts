import { uuid } from '@anchorlib/core';
import { IRPC_PACKET_TYPE, IRPC_STATUS } from './enum.js';
import { CallError } from './error.js';
import { IRPCReader } from './reader.js';
import { IRPC_STORE } from './store.js';
import type { IRPCTransport } from './transport.js';
import type {
  IRPCCallConfig,
  IRPCData,
  IRPCInputs,
  IRPCOutput,
  IRPCPacketStream,
  IRPCPayload,
  IRPCSpec,
  IRPCStatus,
} from './types.js';

export const DEFAULT_RETRY_MODE = 'exponential';
export const DEFAULT_RETRY_DELAY = 1000;

/**
 * Represents an RPC call with promise-like behavior for handling asynchronous operations.
 * Each call has a unique identifier and manages its own resolution state.
 */
export class IRPCCall {
  /**
   * Unique identifier for this RPC call, generated using shortId().
   */
  public readonly id: string;

  /**
   * The status of the RPC call, indicating whether it is pending, resolved, or rejected.
   */
  public status: IRPCStatus = IRPC_STATUS.PENDING;

  /**
   * Flag indicating whether this call has been resolved or rejected.
   * Prevents multiple resolutions of the same call.
   */
  public resolved = false;

  /**
   * The timestamp when the RPC call was started.
   */
  public startedAt = Date.now();

  /**
   * The timestamp when the RPC call was finished.
   */
  public finishedAt?: number;

  /**
   * The value returned by the RPC call.
   */
  public value?: unknown;
  public error?: Error;

  private timerId?: ReturnType<typeof setTimeout>;
  private retryId?: ReturnType<typeof setTimeout>;
  private retries = 0;
  private retryReasons = new Set<Error>();

  public reader: IRPCReader<IRPCData>;

  /**
   * Creates a new IRPCCall instance.
   * @param reader - The reader associated with this call.
   * @param transport - The transport used for dispatching calls.
   * @param payload - The RPC payload containing method and parameters
   * @param options - Options for the call, such as timeout, maxRetries, etc.
   * @param spec - The specification for the RPC call.
   */
  constructor(
    public transport: IRPCTransport,
    public payload: IRPCPayload,
    public options: IRPCCallConfig & { seed?: () => IRPCData },
    reader?: IRPCReader<IRPCData>,
    public spec?: IRPCSpec<IRPCInputs, IRPCOutput>
  ) {
    if (options.timeout) {
      this.timerId = setTimeout(() => {
        // Timed out call does not get retried.
        this.reader.push({
          id: this.id,
          name: this.payload.name,
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: CallError.timeout().json(),
          createdAt: Date.now(),
        } satisfies IRPCPacketStream<IRPCData>);
        this.reader.close();

        clearTimeout(this.retryId);
        this.reject(CallError.timeout(), false);
      }, options.timeout);
    }

    this.reader = reader ?? new IRPCReader<IRPCData>(uuid(), options?.seed?.() as IRPCData);
    this.reader.onClose = () => this.close();
    this.id = this.reader.id;
  }

  public enqueue(packet: IRPCPacketStream<IRPCData>) {
    if (this.resolved) return;

    this.reader.push(packet);

    if (this.reader.status === IRPC_STATUS.SUCCESS) {
      this.resolve(this.reader.data);
    } else if (this.reader.status === IRPC_STATUS.ERROR) {
      this.reject(this.reader.error);
    }
  }

  /**
   * Resolves the RPC call with the provided value.
   * If the call is already resolved, this method does nothing.
   * @param value - The value to resolve the promise with
   */
  resolve(value: IRPCData) {
    if (this.resolved) return;

    this.value = value;
    this.status = IRPC_STATUS.SUCCESS;
    this.resolved = true;
    this.finishedAt = Date.now();
    this.retryReasons.clear();

    clearTimeout(this.timerId);
  }

  /**
   * Rejects the RPC call with the provided reason.
   * If the call is already resolved, this method does nothing.
   * @param reason - Optional error reason for rejecting the promise
   * @param retriable - Flag indicating whether to retry the call
   */
  reject(reason?: Error, retriable = true) {
    if (this.resolved) return;

    const { maxRetries, retryMode = DEFAULT_RETRY_MODE, retryDelay = DEFAULT_RETRY_DELAY } = this.options;

    if (maxRetries && retriable) {
      if (reason) {
        this.retryReasons.add(reason);
      }

      if (this.retries >= maxRetries) {
        IRPC_STORE.error(CallError.maxRetries(this.retryReasons), [{ id: this.id, name: this.payload.name }]);
        this.reject(reason, false);
        this.retryReasons.clear();
        return;
      }

      const delay = retryMode === 'linear' ? retryDelay : retryDelay * 2 ** this.retries;

      this.retryId = setTimeout(() => {
        this.retries++;

        if (this.spec?.stream || this.spec?.standalone) {
          this.reader.resume();
          this.transport
            .dispatch([this], this.spec.standalone)
            .finally(() => {})
            .catch((err) => IRPC_STORE.error(err, [{ id: this.id, name: this.payload.name }]));
          return;
        }

        this.transport.schedule(this);
      }, delay);
    } else {
      this.error = reason;
      this.status = IRPC_STATUS.ERROR;
      this.resolved = true;
      this.finishedAt = Date.now();
      this.retryReasons.clear();

      clearTimeout(this.timerId);
    }
  }

  public close() {
    if (this.resolved) return;

    this.transport.close?.(this);
    this.resolve(this.reader.data);
  }
}
