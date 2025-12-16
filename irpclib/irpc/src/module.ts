import { IRPCCacher } from './cache.js';
import { ERROR_CODE, ERROR_MESSAGE } from './error.js';
import { IRPCTransport } from './transport.js';
import type {
  IRPCData,
  IRPCHandler,
  IRPCInit,
  IRPCInputs,
  IRPCOutput,
  IRPCPackageConfig,
  IRPCPackageInfo,
  IRPCRequest,
  IRPCSpec,
  IRPCSpecStore,
  IRPCStubStore,
} from './types.js';

const DEFAULT_TIMEOUT = 20000;
const NAME_CONSTRAINT = /^[a-zA-Z0-9\-_]+$/;
const VERSION_CONSTRAINT = /^[0-9]+\.[0-9]+\.[0-9]+$/;

/**
 * IRPCPackage represents a package containing multiple IRPC (Isomorphic-RPC) specifications
 * and their corresponding stubs. It manages the configuration, transport, and execution
 * of remote procedure calls.
 */
export class IRPCPackage {
  /**
   * A map storing all IRPC specifications by their names
   */
  public specs: IRPCSpecStore = new Map();

  /**
   * A weak map linking stub functions to their corresponding specifications
   */
  public stubs: IRPCStubStore = new WeakMap();

  /**
   * A map storing caches for each IRPC Entry
   */
  public cache = new WeakMap<IRPCHandler, IRPCCacher>();

  /**
   * Configuration object for the IRPC package
   */
  public config: IRPCPackageConfig = {
    name: 'global',
    version: '1.0.0',
    timeout: DEFAULT_TIMEOUT,
  };

  /**
   * Gets the href URL for this package in the format "name/version"
   */
  public get href(): string {
    return [this.config.name, this.config.version].join('/');
  }

  /**
   * Gets the package information (name, version, and optional description)
   */
  public get info(): IRPCPackageInfo {
    const { name, version, description } = this.config;
    return { name, version, description };
  }

  /**
   * Gets the transport mechanism used for remote calls
   */
  public get transport() {
    return this.config.transport;
  }

  /**
   * Creates a new IRPCPackage instance
   * @param config - Optional partial configuration for the package
   * @throws Error if the package name or version doesn't match the required format
   */
  constructor(config?: Partial<IRPCPackageConfig>) {
    this.configure(config ?? {});
  }

  /**
   * Declares a new IRPC specification and creates a corresponding stub function
   * @param init - The initialization object containing the IRPC specification
   * @returns A stub function that can be used to call the IRPC
   * @throws Error if an IRPC with the same name already exists
   */
  public declare<F, I extends IRPCInputs = IRPCInputs, O extends IRPCOutput = IRPCOutput>(init: IRPCInit<I, O>): F {
    if (this.specs.has(init.name)) {
      throw new Error(`IRPC ${init.name} already exists.`);
    }

    const spec = { ...init } as IRPCSpec<IRPCInputs, IRPCOutput>;
    const caches = new IRPCCacher();
    const timeout = spec.timeout ?? this.config.timeout;

    const stub = (async (...args: IRPCData[]) => {
      if (typeof spec.handler === 'function') {
        return spec.handler(...args);
      }

      if (!this.transport) {
        throw new Error(ERROR_MESSAGE[ERROR_CODE.TRANSPORT_MISSING]);
      }

      if (spec.maxAge) {
        const key = JSON.stringify(args);
        const cache = caches.get(key);

        if (cache) {
          return cache.value;
        }

        const data = await this.transport.call(spec, args, timeout);
        caches.set(key, data, spec.maxAge);

        return data;
      }

      return await this.transport.call(spec, args, timeout);
    }) as IRPCHandler;

    this.specs.set(init.name, spec);
    this.stubs.set(stub, spec);
    this.cache.set(stub, caches);

    return stub as F;
  }

  /**
   * Resolves and executes an IRPC call based on a request object
   * @param req - The request containing the IRPC name and arguments
   * @returns The result of the IRPC execution
   * @throws Error if the IRPC doesn't exist or doesn't have an implementation
   */
  public async resolve(req: IRPCRequest): Promise<IRPCData> {
    const spec = this.specs.get(req.name);

    if (!spec) {
      return Promise.reject(new Error(`IRPC ${req.name} does not exist.`));
    }

    if (typeof spec.handler !== 'function') {
      return Promise.reject(new Error(`IRPC ${req.name} does not have an implementation.`));
    }

    return await spec.handler(...(req.args as IRPCData[]));
  }

  /**
   * Associates a handler function with a stub function
   * @param stub - The stub function created by declare()
   * @param handler - The actual implementation function
   * @returns This IRPCPackage instance for chaining
   * @throws Error if the stub or handler is invalid, or if no IRPC exists for the stub
   */
  public construct<F extends IRPCHandler>(stub: F, handler: F): this {
    if (typeof stub !== 'function') {
      throw new Error(ERROR_MESSAGE[ERROR_CODE.STUB_INVALID]);
    }

    if (typeof handler !== 'function') {
      throw new Error(ERROR_MESSAGE[ERROR_CODE.INVALID_HANDLER]);
    }

    const spec = this.stubs.get(stub);

    if (!spec?.name) {
      throw new Error(ERROR_MESSAGE[ERROR_CODE.NOT_FOUND]);
    }

    spec.handler = handler;

    return this;
  }

  /**
   * Sets the transport mechanism for this package
   * @param transport - The transport instance to use for remote calls
   * @returns This IRPCPackage instance for chaining
   * @throws Error if the transport is not a valid Transport instance
   */
  public use(transport: IRPCTransport): this {
    if (!((transport as unknown) instanceof IRPCTransport)) {
      throw new Error(ERROR_MESSAGE[ERROR_CODE.TRANSPORT_INVALID]);
    }

    this.config.transport = transport;
    return this;
  }

  /**
   * Retrieves an IRPC specification by name or request object
   * @param query - Either a string name or an IRPCRequest object
   * @returns The IRPC specification or undefined if not found
   */
  public get(query: string | IRPCRequest): IRPCSpec<IRPCInputs, IRPCOutput> | undefined {
    if (typeof query === 'string') {
      return this.specs.get(query);
    }

    return this.specs.get(query.name);
  }

  /**
   * Updates the package configuration
   * @param config - Partial configuration object with properties to update
   * @returns This IRPCPackage instance for chaining
   * @throws Error if the provided name or version is invalid
   */
  public configure(config: Partial<IRPCPackageConfig>): this {
    if (config.name && !NAME_CONSTRAINT.test(config.name)) {
      throw new Error(`Invalid IRPC name: ${config.name}`);
    }

    if (config.version && !VERSION_CONSTRAINT.test(config.version)) {
      throw new Error(`Invalid IRPC version: ${config.version}`);
    }

    Object.assign(this.config, config);
    return this;
  }

  /**
   * Invalidates the cache for a specific stub and arguments combination
   * @param stub - The IRPC stub function whose cache needs to be invalidated
   * @param args - The arguments array used as cache key
   */
  public invalidate(stub: IRPCHandler, ...args: IRPCData[]) {
    const caches = this.cache.get(stub);

    if (!caches) return;

    if (args.length) {
      caches.delete(JSON.stringify(args));
    } else {
      caches.clear();
    }
  }
}

/**
 * Creates a new IRPCPackage instance with the given configuration
 * @param config - Optional partial configuration for the package
 * @returns A new IRPCPackage instance
 */
export function createPackage(config?: Partial<IRPCPackageConfig>): IRPCPackage {
  return new IRPCPackage(config);
}
