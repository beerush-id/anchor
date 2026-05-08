import { IRPC_PACKET_TYPE, IRPC_STATUS } from './enum.js';
import { ERROR_CODE, ERROR_MESSAGE } from './error.js';
import type { IRPCPackage } from './module.js';
import { IRPC_STORE } from './store.js';
import type { IRPCTransport } from './transport.js';
import type { IRPCRequest } from './types.js';

export type IRPCMiddleware = () => void | Promise<void>;

export class IRPCRouter {
  /** Array of middleware functions to be executed */
  public middlewares: IRPCMiddleware[] = [];

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
   * Adds a middleware function to the router
   * @param middleware - The middleware function to add
   * @returns The current Router instance for chaining
   */
  public use(middleware: IRPCMiddleware): this {
    if (typeof middleware !== 'function') {
      const error = new Error(ERROR_MESSAGE[ERROR_CODE.INVALID_MIDDLEWARE]);
      console.error(error);
      return this;
    }

    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Resolves middleware functions for a given request
   * @param req - The IRPC request to process middleware for
   * @returns An error response if middleware fails, undefined otherwise
   */
  protected async resolveMiddleware(req: IRPCRequest) {
    for (const middleware of this.middlewares) {
      try {
        await middleware();
      } catch (error) {
        console.error(error);

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
