import type { IRPCDriver } from './driver.js';
import { CrudError } from './error.js';
import type { IRPCPackage } from './module.js';
import type { IRPCCrudMeta, IRPCData, IRPCMeta, IRPCStub } from './types.js';

class NextDriver extends Error {
  constructor() {
    super('Next driver');
  }
}

/** Extracts operational method names from an adapter, excluding its own API. */
type AttachableMethod<T> = string & keyof Omit<T, 'attach' | 'use' | 'dispatch'>;

// biome-ignore lint/suspicious/noExplicitAny: Expect any.
type AnyStub = IRPCStub<any, any[], any>;

export class IRPCAdapter {
  protected drivers = new Set<IRPCDriver<this>>();

  constructor(protected module: IRPCPackage) {}

  /**
   * Dispatches a method call through each registered driver in order
   * @param method - The method name to dispatch
   * @param meta - Resolved entity metadata
   * @param args - Arguments forwarded to the driver method
   * @throws CrudError.notImplemented if no driver handles the method
   */
  protected dispatch<O>(method: string, meta: IRPCMeta, ...args: unknown[]): Promise<O> | O {
    for (const driver of this.drivers) {
      const fn = driver[method as never];
      if (!fn) continue;
      try {
        return (fn as (...args: unknown[]) => never)(meta, ...args);
      } catch (err) {
        if (err instanceof NextDriver) continue;
        throw err;
      }
    }
    throw CrudError.notImplemented(method);
  }

  /**
   * Attaches a single stub to a specific method on this adapter
   * @param stub - The stub function to attach
   * @param method - The method name matching an adapter operation
   * @throws CrudError.notFound if the stub is not registered in the package
   */
  public attach(stub: AnyStub, method: AttachableMethod<this>): this;
  /**
   * Attaches stubs to this adapter by matching object keys to adapter methods
   * @param stubs - Object mapping method names to stub functions
   * @throws CrudError.notFound if a stub is not registered in the package
   */
  public attach(stubs: Partial<Record<AttachableMethod<this>, AnyStub>>): this;

  public attach(stubOrStubs: unknown, m?: string): this {
    const stubs = m ? { [m]: stubOrStubs } : (stubOrStubs as Record<string, unknown>);
    const key = this.module.config.key ?? 'id';

    for (const [method, stub] of Object.entries(stubs)) {
      if (!stub) continue;

      // biome-ignore lint/suspicious/noExplicitAny: Expect any.
      const spec = (this.module as any)['stubs'].get(stub);
      if (!spec) throw CrudError.notFound();

      const meta: IRPCCrudMeta = {
        name: spec.name.replace(`.${method}`, ''),
        key,
        description: spec.description,
        schema: spec.schema,
        maxAge: spec.maxAge,
        coalesce: spec.coalesce,
      };

      this.module.construct(
        stub as never,
        ((...args: IRPCData[]) => {
          // biome-ignore lint/suspicious/noExplicitAny: Expect any.
          return (this as any)[method](meta, ...args);
        }) as never
      );
    }

    return this;
  }

  /**
   * Registers a driver to handle dispatched operations
   * @param driver - The driver implementation
   */
  public use(driver: IRPCDriver<this>): this {
    this.drivers.add(driver);
    return this;
  }

  /**
   * Signals the current driver to pass execution to the next driver in the chain
   */
  public static next(): NextDriver {
    return new NextDriver();
  }
}

/**
 * Attaches handlers to IRPC stubs and bridges them to drivers.
 * Dispatches calls through the registered driver chain.
 */
export class IRPCCrudAdapter extends IRPCAdapter {
  /**
   * Runs a get operation through the driver chain
   * @param meta - Resolved entity metadata
   * @param id - The entity identifier
   */
  public get(meta: IRPCCrudMeta, id: string): Promise<IRPCData> | IRPCData {
    return this.dispatch('get', meta, id);
  }

  /**
   * Runs a create operation through the driver chain
   * @param meta - Resolved entity metadata
   * @param data - The entity data to create
   */
  public create<D extends IRPCData>(meta: IRPCCrudMeta, data: D): Promise<IRPCData> | IRPCData {
    return this.dispatch('create', meta, data);
  }

  /**
   * Runs an update operation through the driver chain
   * @param meta - Resolved entity metadata
   * @param id - The entity identifier
   * @param data - The entity data to update
   */
  public update(meta: IRPCCrudMeta, id: string, data: IRPCData): Promise<IRPCData> | IRPCData {
    return this.dispatch('update', meta, id, data);
  }

  /**
   * Runs a delete operation through the driver chain
   * @param meta - Resolved entity metadata
   * @param id - The entity identifier
   */
  public delete(meta: IRPCCrudMeta, id: string): Promise<IRPCData> | IRPCData {
    return this.dispatch('delete', meta, id);
  }
}
