import { IRPCCall } from './call.js';
import { IRPC_PACKET_TYPE, IRPC_STATUS } from './enum.js';
import { ERROR_CODE, ERROR_MESSAGE } from './error.js';
import type {
  IRPCCallConfig,
  IRPCData,
  IRPCInputs,
  IRPCOutput,
  IRPCPayload,
  IRPCSpec,
  TransportConfig,
} from './types.js';

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
   * @param config - Optional call configuration, including timeout, retry settings, and more.
   * @returns A promise that resolves with the RPC response data or rejects with an error.
   */
  public call(spec: IRPCSpec<IRPCInputs, IRPCOutput>, args: IRPCData[], config?: IRPCCallConfig) {
    const payload: IRPCPayload = { name: spec.name, args };
    const { timeout, maxRetries, retryMode, retryDelay } = { ...this.config, ...config };

    const call = new IRPCCall(this, payload, { timeout, maxRetries, retryMode, retryDelay });

    this.schedule(call);

    return call.reader;
  }

  /**
   * Schedules an RPC call for execution, implementing debouncing logic.
   * Queued calls will be dispatched after the configured debounce delay.
   * @param call - The RPC call to schedule.
   */
  public schedule(call: IRPCCall) {
    const { debounce } = (this.config ?? {}) as TransportConfig;

    if (debounce === false) {
      this.dispatch([call])
        .finally(() => {})
        .catch(() => {});
      return;
    }

    const timeout = typeof debounce === 'number' && !Number.isNaN(debounce) ? debounce : 0;

    const dispatch = () => {
      this.dispatch(Array.from(this.queue))
        .finally(() => {})
        .catch(() => {});
      this.queue.clear();
    };

    if (!this.queue.size) {
      if (timeout === 0) {
        queueMicrotask(dispatch);
      } else {
        setTimeout(dispatch, timeout);
      }
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
      call.enqueue({
        id: call.id,
        name: call.payload.name,
        type: IRPC_PACKET_TYPE.CLOSE,
        status: IRPC_STATUS.ERROR,
        error: {
          code: ERROR_CODE.TRANSPORT_NOT_IMPLEMENTED,
          message: ERROR_MESSAGE[ERROR_CODE.TRANSPORT_NOT_IMPLEMENTED],
        },
        createdAt: Date.now(),
      });
    });
  }
}
