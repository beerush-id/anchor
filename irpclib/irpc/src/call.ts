import { IRPC_STATUS } from './enum.js';
import type { IRPCPayload, IRPCStatus } from './types.js';
import { uuid } from './uuid.js';

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

  /**
   * Creates a new IRPCCall instance.
   * @param payload - The RPC payload containing method and parameters
   * @param resolver - Function to resolve the associated promise with a value
   * @param rejector - Function to reject the associated promise with an error
   * @param timeout - Optional timeout value in milliseconds
   */
  constructor(
    public payload: IRPCPayload,
    private resolver: (value: unknown) => void,
    private rejector: (reason?: Error) => void,
    public timeout?: number
  ) {}

  /**
   * Resolves the RPC call with the provided value.
   * If the call is already resolved, this method does nothing.
   * @param value - The value to resolve the promise with
   */
  resolve(value: unknown) {
    if (this.resolved) return;

    this.value = value;
    this.status = IRPC_STATUS.SUCCESS;
    this.resolved = true;
    this.finishedAt = Date.now();

    this.resolver(value);
  }

  /**
   * Rejects the RPC call with the provided reason.
   * If the call is already resolved, this method does nothing.
   * @param reason - Optional error reason for rejecting the promise
   */
  reject(reason?: Error) {
    if (this.resolved) return;

    this.error = reason;
    this.status = IRPC_STATUS.ERROR;
    this.resolved = true;
    this.finishedAt = Date.now();

    this.rejector(reason);
  }
}
