import { IRPCCall } from './call.js';
import { ERROR_CODE, ERROR_MESSAGE } from './error.js';
import type { IRPCData, IRPCInputs, IRPCOutput, IRPCPayload, IRPCSpec, TransportConfig } from './types.js';

/**
 * IRPCTransport is responsible for managing and dispatching RPC calls.
 * It handles queuing, debouncing, and timeout management for RPC requests.
 */
export class IRPCTransport {
  /**
   * A set of pending RPC calls that are queued for execution.
   */
  public queue = new Set<IRPCCall>();

  /**
   * Creates a new IRPCTransport instance.
   * @param config - Optional transport configuration including timeout and debounce settings.
   */
  constructor(public config?: TransportConfig) {}

  /**
   * Initiates an RPC call with the given specification and arguments.
   * @param spec - The RPC specification defining the method to call.
   * @param args - An array of arguments to pass to the RPC method.
   * @returns A promise that resolves with the RPC response data or rejects with an error.
   */
  public call(spec: IRPCSpec<IRPCInputs, IRPCOutput>, args: IRPCData[]) {
    const payload: IRPCPayload = { name: spec.name, args };

    return new Promise<IRPCData>((resolve, reject) => {
      const timeout = this.config?.timeout
        ? setTimeout(() => {
            call.reject(new Error(ERROR_MESSAGE[ERROR_CODE.TIMEOUT]));
          }, this.config?.timeout)
        : undefined;

      const call = new IRPCCall(
        payload,
        (value) => {
          resolve(value as IRPCData);
          clearTimeout(timeout);
        },
        (reason) => {
          reject(reason);
          clearTimeout(timeout);
        }
      );

      this.schedule(call);
    });
  }

  /**
   * Schedules an RPC call for execution, implementing debouncing logic.
   * Queued calls will be dispatched after the configured debounce delay.
   * @param call - The RPC call to schedule.
   */
  protected schedule(call: IRPCCall) {
    if (!this.queue.size) {
      setTimeout(() => {
        this.dispatch(Array.from(this.queue));
        this.queue.clear();
      }, this.config?.debounce ?? 0);
    }

    this.queue.add(call);
  }

  /**
   * Dispatches a batch of RPC calls. This base implementation rejects all calls
   * with a "not implemented" error. Subclasses should override this method to
   * provide actual transport mechanism.
   * @param calls - An array of RPC calls to dispatch.
   * @returns A promise that resolves when all calls have been processed.
   */
  protected async dispatch(calls: IRPCCall[]): Promise<void> {
    calls.forEach((call) => {
      call.reject(new Error(ERROR_MESSAGE[ERROR_CODE.TRANSPORT_NOT_IMPLEMENTED]));
    });
  }
}
