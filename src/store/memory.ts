import { anchor, AnchorSchema, Init, State } from '../core/index.js';
import { COMMON_SCHEMA_TYPES, SchemaType } from '../schema/index.js';
import { logger } from '../utils/index.js';

export enum MemoryStatus {
  Changed = 'changed',
  Initialized = 'initialized',
  Loaded = 'loaded',
}

export type MemoryOptions<T extends Init, R extends boolean = true> = {
  strict?: boolean;
  version?: string;
  recursive?: R;
  schema?: AnchorSchema<T>;
  allowedTypes?: SchemaType[];
};

export type MemoryState<T extends Init, R extends boolean = true> = {
  name: string;
  value: State<T, R>;
  status: MemoryStatus;
} & MemoryOptions<T, R>;

export type Initializer<T extends Init, R extends boolean = true> = () => {
  init: T;
  options?: MemoryOptions<T, R>;
};

export type MemoryEvent = {
  type: 'set' | 'delete' | 'update';
  name: string;
  value?: State<Init>;
};

export class MemoryStore {
  private states: Map<string, MemoryState<Init>> = new Map();
  private subscribers: Set<(event: MemoryEvent) => void> = new Set();

  constructor(public version = '1.0.0') {}

  public has(name: string): boolean {
    return this.states.has(name);
  }

  public get<T extends Init, R extends boolean = true>(name: string): MemoryState<T, R> {
    return this.states.get(name) as never;
  }

  public set<T extends Init, R extends boolean = true>(name: string, state: MemoryState<T, R>): this {
    this.states.set(name, state as never);
    this.publish({ type: 'set', name, value: state.value as never });

    return this;
  }

  public delete(name: string): this {
    this.states.delete(name);
    this.publish({ type: 'delete', name });

    return this;
  }

  public entries() {
    return this.states.entries();
  }

  public subscribe(callback: (event: MemoryEvent) => void) {
    this.subscribers.add(callback);

    return () => {
      this.subscribers.delete(callback);
    };
  }

  public publish(event: MemoryEvent) {
    for (const callback of this.subscribers) {
      callback(event);
    }
  }
}

let CURRENT_MEMORY_STORE: MemoryStore;

export function memoryState<T extends Init, R extends boolean = true>(
  name: string,
  init: Initializer<T> | T,
  options?: MemoryOptions<T, R>
): State<T, R> {
  if (typeof CURRENT_MEMORY_STORE === 'undefined') {
    if (typeof window === 'undefined') {
      return directState(init, options);
    }

    CURRENT_MEMORY_STORE = new MemoryStore();
  }

  return cacheState(CURRENT_MEMORY_STORE, name, init, options) as never;
}

// @deprecated
export const memory = memoryState;

export function directState<T extends Init, R extends boolean = true>(
  init: T | Initializer<T>,
  options?: MemoryOptions<T, R>
): State<T, R> {
  if (typeof init === 'function') {
    const { init: data, options: initOptions } = init() as {
      init: T;
      options: MemoryOptions<T>;
    };

    init = data;
    options = options ?? (initOptions as never);
  }

  return anchor(init as T, options?.recursive, options?.strict, options?.schema, options?.allowedTypes) as never;
}

export function cacheState<T extends Init, R extends boolean = true>(
  store: MemoryStore,
  name: string,
  init: T | Initializer<T>,
  options?: MemoryOptions<T, R>
) {
  let state: MemoryState<T> = store.get(name) as never;

  if (typeof state === 'undefined') {
    if (typeof init === 'function') {
      const { init: data, options: initOptions } = init() as {
        init: T;
        options: MemoryOptions<T, R>;
      };

      init = data;
      options = options ?? initOptions;
    }

    const {
      schema,
      allowedTypes = COMMON_SCHEMA_TYPES,
      recursive = true as R,
      strict = true,
      version = '1.0.0',
    } = options ?? {};

    state = {
      name,
      value: anchor<T, R>(init, recursive, strict, schema, allowedTypes),
      status: MemoryStatus.Initialized,
      schema,
      allowedTypes,
      version,
      recursive,
    } as never;

    store.set(name, state);
    logger.debug(`[anchor:store] State "${name}" initialized.`);
  }

  if (state.status === MemoryStatus.Loaded) {
    if (typeof options === 'undefined' && typeof init === 'function') {
      options = (init().options ?? {}) as never;
    }

    state.value = anchor(
      state.value,
      state.recursive ?? options?.recursive,
      state.strict ?? options?.strict,
      options?.schema as never,
      options?.allowedTypes
    ) as never;

    state.status = MemoryStatus.Initialized;
    store.publish({ type: 'update', name, value: state.value as never });
    logger.debug(`[anchor:store] State "${name}" initialized.`);
  }

  return state.value;
}

export function memoryContext(store: MemoryStore) {
  if (typeof window === 'undefined') return;

  const current = CURRENT_MEMORY_STORE;
  CURRENT_MEMORY_STORE = store;

  return () => {
    CURRENT_MEMORY_STORE = current;
  };
}
