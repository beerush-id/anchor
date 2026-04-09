import { IRPC_PACKET_TYPE, IRPC_STATUS } from './enum.js';
import { ERROR_CODE, ERROR_MESSAGE } from './error.js';
import { IRPCReader } from './reader.js';
import type { IRPCTransport } from './transport.js';
import type { IRPCCallConfig, IRPCData, IRPCPacketStream, IRPCPayload, IRPCStatus } from './types.js';
import { uuid } from './uuid.js';

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
  public id = uuid();

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

  private readonly timerId?: number;
  private retries = 0;
  private retryReasons = new Set<Error>();

  public reader: IRPCReader<IRPCData>;

  /**
   * Creates a new IRPCCall instance.
   * @param transport
   * @param payload - The RPC payload containing method and parameters
   * @param options - Options for the call, such as timeout, maxRetries, etc.
   */
  constructor(
    public transport: IRPCTransport,
    public payload: IRPCPayload,
    public options: IRPCCallConfig
  ) {
    if (options.timeout) {
      this.timerId = setTimeout(() => {
        // Timed out call does not get retried.
        this.reader.push({
          id: this.id,
          name: this.payload.name,
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: {
            code: ERROR_CODE.TIMEOUT,
            message: ERROR_MESSAGE[ERROR_CODE.TIMEOUT],
          },
          createdAt: Date.now(),
        } satisfies IRPCPacketStream<IRPCData>);

        this.reject(new Error(ERROR_MESSAGE[ERROR_CODE.TIMEOUT]), false);
      }, options.timeout) as never as number;
    }

    this.reader = new IRPCReader(this.id);
  }

  public enqueue(packet: IRPCPacketStream<IRPCData>) {
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
        console.error(ERROR_MESSAGE[ERROR_CODE.CALL_MAX_RETRIES_REACHED], this.retryReasons);
        this.reject(reason, false);
        return;
      }

      const delay = retryMode === 'linear' ? retryDelay : retryDelay * 2 ** this.retries;

      setTimeout(() => {
        this.retries++;
        this.transport.schedule(this);
      }, delay);
    } else {
      this.error = reason;
      this.status = IRPC_STATUS.ERROR;
      this.resolved = true;
      this.finishedAt = Date.now();

      clearTimeout(this.timerId);
    }
  }
}
