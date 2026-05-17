import { IRPC_PACKET_TYPE, IRPC_STATUS } from './enum.js';
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
