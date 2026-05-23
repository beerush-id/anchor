import { anchor, createObserver, isBrowser, microtask, onCleanup, replay, uuid } from '@anchorlib/core';
import { IRPCCacher } from './cache.js';
import { getAbortSignal } from './context.js';
import { IRPC_STATUS } from './enum.js';
import { ERROR_CODE, ERROR_MESSAGE } from './error.js';
import { IRPCReader } from './reader.js';
import { RemoteState } from './state.js';
import { IRPC_STORE } from './store.js';
import { IRPCTransport } from './transport.js';
import type {
  IRPCCallConfig,
  IRPCData,
  IRPCDataSchema,
  IRPCDeclareInit,
  IRPCFunction,
  IRPCHandler,
  IRPCInputs,
  IRPCOutput,
  IRPCPackageConfig,
  IRPCPackageInfo,
  IRPCReadable,
  IRPCRequest,
  IRPCSpec,
  IRPCSpecStore,
  IRPCStatus,
  IRPCStreamInit,
  IRPCStub,
  IRPCStubStore,
} from './types.js';

const DEFAULT_TIMEOUT = 20000;
const NAME_CONSTRAINT = /^[a-zA-Z0-9\-_]+$/;
const VERSION_CONSTRAINT = /^[0-9]+\.[0-9]+\.[0-9]+$/;

export type IRPCHookArgs<F> = F extends (...args: infer A) => unknown
  ? { name: string; args: A }
  : { name: string; args: unknown[] };
export type IRPCSpecHook<F> = (req: IRPCHookArgs<F>) => void | Promise<void>;

/**
 * IRPCPackage represents a package containing multiple IRPC (Isomorphic-RPC) specifications
 * and their corresponding stubs. It manages the configuration, transport, and execution
 * of remote procedure calls.
 */
export class IRPCPackage {
  /**
   * A map storing all IRPC specifications by their names
   */
  private specs: IRPCSpecStore = new Map();

  private hooks = new Map<IRPCSpec<IRPCInputs, IRPCDataSchema>, Set<IRPCSpecHook<IRPCHandler>>>();

  /**
   * A weak map linking stub functions to their corresponding specifications
   */
  private stubs: IRPCStubStore = new WeakMap();

  /**
   * A map storing caches for each IRPC Entry
   */
  private cache = new WeakMap<IRPCHandler, IRPCCacher>();

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
    IRPC_STORE.register(this);
  }

  /**
   * Declares a new IRPC specification and creates a corresponding stub function
   * @param options - The initialization object containing the IRPC specification
   * @returns A stub function that can be used to call the IRPC
   * @throws Error if an IRPC with the same name already exists
   */
  public declare<F, I extends IRPCInputs = IRPCInputs, O extends IRPCOutput = IRPCOutput>(
    options: IRPCDeclareInit<F, I, O>
  ): IRPCFunction<F> {
    const $options = options as never as IRPCStreamInit<IRPCInputs, IRPCOutput, IRPCData>;

    if (this.specs.has($options.name)) {
      throw new Error(`IRPC ${$options.name} already exists.`);
    }

    const spec = { init: () => undefined, ...$options } as IRPCSpec<IRPCInputs, IRPCOutput>;
    const calls = new Map<string, unknown>();
    const caches = new IRPCCacher();

    /* General stub for immediate execution */
    const stub = ((...args: IRPCData[]) => {
      return execute(args, new IRPCReader<IRPCData>(uuid(), spec.init!()));
    }) as IRPCStub<F, unknown[], IRPCData>;

    /** Browser only stub for single immediate execution **/
    stub.once = (...args: IRPCData[]) => {
      return prepare(() => args);
    };

    /* Browser only stub with immediate execution */
    stub.with = (getArgs, debounce) => {
      const readArgs = typeof getArgs === 'function' ? getArgs : () => getArgs;
      return prepare(readArgs, false, debounce);
    };

    /* Browser only stub with deferred execution */
    stub.when = (getArgs, debounce) => {
      const readArgs = typeof getArgs === 'function' ? getArgs : () => getArgs;
      return prepare(readArgs, true, debounce);
    };

    /* General stub for manual execution */
    stub.later = (debounce) => {
      // biome-ignore lint/suspicious/noExplicitAny: <Expect any>
      const reader = new IRPCReader<IRPCData>(uuid(), spec.init!(), IRPC_STATUS.IDLE, true) as any;

      if (debounce) {
        const [schedule, cancel] = microtask(debounce);

        reader.dispatch = (...args: unknown[]) =>
          schedule(() => {
            reader.resume();
            execute(args as IRPCData[], reader);
          });

        onCleanup(cancel);
        return reader as never;
      }

      reader.dispatch = (...args: unknown[]) => {
        reader.resume();
        execute(args as IRPCData[], reader);
      };

      return reader as never;
    };

    /**
     * A preparation utility to generate and schedule call on the browser environment.
     *
     * @param getArgs - A function that returns the arguments for the call.
     * @param deferred - A flag indicating whether the call should be deferred.
     * @param debounce - The debounce time in milliseconds.
     * @returns {IRPCReader<IRPCData>} - The reader for the call.
     */
    function prepare(getArgs: () => unknown[], deferred?: boolean, debounce = 0): IRPCReader<IRPCData> {
      const reader = new IRPCReader<IRPCData>(uuid(), spec.init!(), deferred ? IRPC_STATUS.IDLE : IRPC_STATUS.PENDING);

      if (isBrowser()) {
        const observer = createObserver(() => {
          observer.reset();
          dispatch();
        });
        const [schedule, cancel] = microtask(debounce);
        const dispatch = (coalesce = true) => {
          const args = observer.run(getArgs);

          if (!coalesce) return execute(args as IRPCData[], reader);

          schedule(() => {
            execute(args as IRPCData[], reader);
          });
        };

        if (deferred) {
          observer.run(getArgs);
        } else {
          dispatch(false);
        }

        onCleanup(() => {
          cancel();
          observer.destroy();
        });
      }

      return reader;
    }

    const execute = (args: IRPCData[], reader: IRPCReader<IRPCData>) => {
      if (!this.transport && typeof spec.handler !== 'function') {
        return Promise.reject(new Error(ERROR_MESSAGE[ERROR_CODE.TRANSPORT_MISSING]));
      }

      reader.status = IRPC_STATUS.PENDING;

      const callKey = JSON.stringify(args);
      const cached = caches.get(callKey);

      if (cached) {
        return cached.value;
      }

      if (spec.coalesce !== false && calls.has(callKey)) {
        return calls.get(callKey);
      }

      const { timeout, maxRetries, retryDelay, retryMode, init } = { ...this.config, ...spec };
      const config = { timeout, maxRetries, retryDelay, retryMode, init } as IRPCCallConfig;

      const hooks = this.hooks.get(spec);
      if (hooks) {
        hooks.forEach((hook) => hook({ name: spec.name, args }));
      }

      const call =
        typeof spec.handler === 'function'
          ? intercept(spec, args, reader)
          : this.transport!.call(spec, args, config, reader);

      calls.set(callKey, call);

      if (spec.maxAge) {
        caches.set(callKey, call, spec.maxAge);
      }

      onCleanup(() => call.close());
      call.finally(() => calls.delete(callKey)).catch((err) => IRPC_STORE.error(err, [{ name: spec.name }]));

      return reader;
    };

    this.specs.set($options.name, spec);
    this.stubs.set(stub, spec);
    this.cache.set(stub, caches);
    this.hooks.set(spec, new Set());

    return stub as IRPCFunction<F>;
  }

  /**
   * Resolves and executes an IRPC call based on a request object
   * @param req - The request containing the IRPC name and arguments
   * @returns The result of the IRPC execution
   * @throws Error if the IRPC doesn't exist or doesn't have an implementation
   */
  public resolve(req: IRPCRequest): IRPCData | Promise<IRPCData> | RemoteState<IRPCData> {
    const spec = this.specs.get(req.name);

    if (!spec) {
      return Promise.reject(new Error(`IRPC ${req.name} does not exist.`)) as never;
    }

    if (typeof spec.handler !== 'function') {
      return Promise.reject(new Error(`IRPC ${req.name} does not have an implementation.`)) as never;
    }

    return spec.handler(...(req.args as IRPCData[]));
  }

  /**
   * Associates a handler function with a stub function
   * @param stub - The stub function created by declare()
   * @param handler - The actual implementation function
   * @returns This IRPCPackage instance for chaining
   * @throws Error if the stub or handler is invalid, or if no IRPC exists for the stub
   */
  public construct<F, A extends unknown[], R extends IRPCData>(stub: IRPCStub<F, A, R>, handler: F): this {
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
   * Registers a hook function for a specific stub function
   * @param stub - The stub function created by declare()
   * @param handler - The hook function to register
   * @returns This IRPCPackage instance for chaining
   * @throws Error if the stub is invalid or if no IRPC exists for the stub
   */
  public hook<F extends IRPCHandler>(stub: F, handler: IRPCSpecHook<F>): this {
    if (!this.stubs.has(stub as IRPCHandler)) {
      const error = new Error(ERROR_MESSAGE[ERROR_CODE.NOT_FOUND]);
      IRPC_STORE.error(error);
      return this;
    }

    const spec = this.stubs.get(stub as IRPCHandler)!;
    this.hooks.get(spec)!.add(handler as IRPCSpecHook<IRPCHandler>);
    return this;
  }

  /**
   * Resolves and executes all registered hooks for a given request
   * @param req - The request containing the IRPC name and arguments
   * @returns A promise that resolves when all hooks have been executed
   * @throws Error if no IRPC exists for the request or if the hooks are not registered
   */
  public async resolveHooks(req: IRPCRequest): Promise<void> {
    const spec = this.specs.get(req.name);

    if (!spec || !this.hooks.has(spec)) {
      throw new Error(ERROR_MESSAGE[ERROR_CODE.NOT_FOUND]);
    }

    const hooks = this.hooks.get(spec)!;

    for (const hook of hooks) {
      await hook(req);
    }
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

    if (this.transport) {
      this.transport.modules.delete(this);
    }

    transport.modules.add(this);
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

/**
 * Intercepts local function call to get an instant response without remote execution.
 *
 * @param reader - The reader object to intercept.
 * @param spec - The IRPC specification for the function call.
 * @param args - The arguments to be passed to the function.
 * @returns {IRPCReader<IRPCData>} - The IRPCReader object for consumer.
 */
export function intercept(
  spec: IRPCSpec<IRPCInputs, IRPCOutput>,
  args: unknown[],
  reader: IRPCReader<IRPCData>
): IRPCReader<IRPCData> {
  const signal = getAbortSignal();

  if (signal?.aborted) {
    reader.abort();
    return reader;
  }

  const abort = () => reader.abort();
  signal?.addEventListener('abort', abort, { once: true });

  try {
    const result = spec.handler(...args) as RemoteState<unknown>;

    if (!(result instanceof Promise)) {
      reader.accept(result);
      signal?.removeEventListener('abort', abort);
      return reader;
    }

    if (!(result instanceof RemoteState)) {
      (result as Promise<IRPCData>)
        .then((value) => {
          reader.accept(value);
        })
        .catch((err) => {
          reader.reject(err);
        })
        .finally(() => {
          signal?.removeEventListener('abort', abort);
        });

      return reader;
    }

    anchor.assign(reader.state as IRPCReadable<unknown>, result.state as IRPCReadable<unknown>);

    const unsubscribe = result.subscribe((_, event) => {
      if (event.type === 'init') return;

      const [rootKey] = event.keys;
      if (rootKey === 'status') {
        reader.status = event.value as IRPCStatus;

        if (reader.status === IRPC_STATUS.SUCCESS || reader.status === IRPC_STATUS.ERROR) {
          signal?.removeEventListener('abort', subAbort);
          unsubscribe();
        }

        return;
      }

      replay(reader.state, event);
    });

    const subAbort = () => {
      unsubscribe();
      reader.abort();
      result.abort();
    };

    signal?.addEventListener('abort', subAbort, { once: true });
    signal?.removeEventListener('abort', abort);
  } catch (error) {
    reader.reject(error as Error);
    signal?.removeEventListener('abort', abort);
  }

  return reader;
}
