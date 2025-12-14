import type { IRPCPayload } from './types.js';
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
   * Flag indicating whether this call has been resolved or rejected.
   * Prevents multiple resolutions of the same call.
   */
  public resolved = false;

  /**
   * Creates a new IRPCCall instance.
   * @param payload - The RPC payload containing method and parameters
   * @param resolver - Function to resolve the associated promise with a value
   * @param rejector - Function to reject the associated promise with an error
   */
  constructor(
    public payload: IRPCPayload,
    public resolver: (value: unknown) => void,
    public rejector: (reason?: Error) => void
  ) {}

  /**
   * Resolves the RPC call with the provided value.
   * If the call is already resolved, this method does nothing.
   * @param value - The value to resolve the promise with
   */
  resolve(value: unknown) {
    if (this.resolved) return;

    this.resolved = true;
    this.resolver(value);
  }

  /**
   * Rejects the RPC call with the provided reason.
   * If the call is already resolved, this method does nothing.
   * @param reason - Optional error reason for rejecting the promise
   */
  reject(reason?: Error) {
    if (this.resolved) return;

    this.resolved = true;
    this.rejector(reason);
  }
}
