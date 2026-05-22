import { withIsolation } from '@anchorlib/core';
import { createContext } from './context.js';
import { IRPC_BASE_CONTEXT, IRPC_PACKET_TYPE, IRPC_STATUS } from './enum.js';
import { ERROR_CODE, ERROR_MESSAGE } from './error.js';
import type { IRPCPackage } from './module.js';
import { IRPC_STORE } from './store.js';
import type { IRPCTransport } from './transport.js';
import type { IRPCRequest } from './types.js';

export type IRPCHook = () => void | Promise<void>;

export class IRPCRouter {
  /** Array of middleware functions to be executed */
  public hooks: IRPCHook[] = [];

  /**
   * Creates a new Router instance
   * @param {IRPCPackage} module - The IRPC package module to resolve requests against
   * @param {IRPCTransport} transport - The transport mechanism to use for resolving requests
   */
  constructor(
    public module: IRPCPackage,
    public transport: IRPCTransport
  ) {
    IRPC_STORE.route(this);
  }

  /**
   * Adds a hook function to the router
   * @param hook - The hook function to add
   * @returns The current Router instance for chaining
   */
  public use(hook: IRPCHook): this {
    if (typeof hook !== 'function') {
      const error = new Error(ERROR_MESSAGE[ERROR_CODE.INVALID_HOOK]);
      IRPC_STORE.error(error);
      return this;
    }

    this.hooks.push(hook);
    return this;
  }

  /**
   * Run a function within an isolated IRPC Router context.
   * This make sure any subsequent RPC calls will be seeded with the hooks added to the router.
   *
   * @param handler - The handler function to isolate
   * @param controller - The AbortController to use for cancellation
   * @param context - Additional context to pass to the handler
   * @returns The result of the isolated handler function
   */
  public isolate<T>(
    handler: () => T | Promise<T>,
    controller: AbortController,
    context: Array<[string | symbol, unknown]> = []
  ) {
    const ctx = createContext([
      [IRPC_BASE_CONTEXT.ABORT_SIGNAL, controller.signal],
      [IRPC_BASE_CONTEXT.ABORT_CONTROLLER, controller],
      ...context,
    ]);

    return withIsolation(
      async () => {
        for (const hook of this.hooks) {
          await hook();
        }

        return handler();
      },
      true,
      ctx
    );
  }

  /**
   * Resolves hook functions for a given request
   * @param req - The IRPC request to process hook for
   * @returns An error response if hook fails, undefined otherwise
   */
  protected async resolveHooks(req: IRPCRequest) {
    for (const hook of this.hooks) {
      try {
        await hook();
      } catch (error) {
        IRPC_STORE.error(error as Error, [req.id, req.name]);

        return {
          id: req.id,
          name: req.name,
          type: IRPC_PACKET_TYPE.CLOSE,
          status: IRPC_STATUS.ERROR,
          error: {
            code: ERROR_CODE.UNKNOWN,
            message: ERROR_MESSAGE[ERROR_CODE.UNKNOWN],
          },
          createdAt: Date.now(),
        };
      }
    }
  }
}
