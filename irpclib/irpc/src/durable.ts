import {
  anchor,
  type AnyType,
  type Linkable,
  mutable,
  replay,
  safeRun,
  type StateChange,
  type StateUnsubscribe,
  subscribe,
  uuid,
} from '@anchorlib/core';

/**
 * A callback function that receives state changes from a durable source.
 *
 * @param event The state change event.
 */
export type DurableSubscriber = (event: StateChange) => void;

/**
 * An interface representing a bridge connection to a Durable Object.
 * This is typically used by the client to interact with the remote state.
 */
export type DurableBridge = {
  /**
   * Sends a local state change event to the remote Durable Object.
   *
   * @param event The state change event.
   * @param emitter The unique identifier of the client emitting the event.
   */
  replay(event: StateChange, emitter: string): Promise<void>;

  /**
   * Subscribes to the remote Durable Object's state changes.
   *
   * @param id The unique identifier of the subscribing client.
   * @param handler An optional callback to handle incoming events.
   * @returns A Promise that resolves to a Response containing an NDJSON stream.
   */
  subscribe(id: string, handler?: DurableSubscriber): Promise<Response>;
};

/**
 * A durable state container that synchronizes state changes across multiple clients
 * using a publish-subscribe model over NDJSON streams.
 *
 * @template T The type of the underlying data object.
 */
export class Durable<T extends Record<string, AnyType>> {
  #readers = new Map<string, ReadableStream>();
  #publishers = new Map<string, DurableSubscriber>();
  #subscribers = new Map<string, DurableSubscriber>();
  #unsubscribe: StateUnsubscribe;
  #currentEmitter?: string;

  /**
   * The reactive state wrapper containing the data object.
   */
  public state: { data: T };

  /**
   * Retrieves the raw data object from the reactive state.
   */
  public get data() {
    return this.state.data;
  }

  /**
   * Creates a new Durable instance with an initial data state.
   *
   * @param init The initial data object. Defaults to an empty object.
   */
  constructor(init: T = {} as T) {
    this.state = safeRun(() => mutable({ data: init }));

    this.#unsubscribe = safeRun(() =>
      subscribe(this.state, (_, event) => {
        if (event.type === 'init') return;

        for (const [id, handler] of this.#subscribers.entries()) {
          if (this.#currentEmitter !== id) {
            handler(event);
          }
        }

        for (const [id, handler] of this.#publishers.entries()) {
          if (this.#currentEmitter !== id) {
            handler(event);
          }
        }
      })
    );
  }

  /**
   * Replays a state change event onto the current state and broadcasts it
   * to all connected subscribers except the emitter.
   *
   * @param event The state change event to apply.
   * @param emitter The unique identifier of the client that originated the event.
   */
  public replay(event: StateChange, emitter: string) {
    this.#currentEmitter = emitter;
    replay(this.state, { ...event, prev: undefined });
    this.#currentEmitter = undefined;
  }

  /**
   * Subscribes a client to the state changes, returning an NDJSON stream response
   * that pushes the initial state snapshot followed by any subsequent mutations.
   *
   * @param id The unique identifier for this subscriber connection.
   * @param handler An optional callback function to invoke when state changes occur.
   * @returns A Response object containing the chunked NDJSON stream.
   */
  public subscribe(id: string, handler?: DurableSubscriber) {
    if (typeof handler === 'function') {
      this.#subscribers.set(id, handler);
    }

    const abortController = new AbortController();
    const reader = new ReadableStream({
      start: (controller) => {
        controller.enqueue(
          encode({
            type: 'init',
            keys: [],
            value: anchor.get(this.state.data as Linkable, true),
          })
        );

        const handler: DurableSubscriber = (e) => {
          controller.enqueue(encode({ ...e, prev: undefined }));
        };

        this.#publishers.set(id, handler);

        abortController.signal.addEventListener(
          'abort',
          () => {
            this.#publishers.delete(id);
          },
          { once: true }
        );
      },
      cancel: (reason) => {
        abortController.abort(reason);

        this.#readers.delete(id);
        this.#publishers.delete(id);
      },
    });

    this.#readers.set(id, reader);

    return new Response(reader, {
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Transfer-Encoding': 'chunked',
      },
    });
  }

  /**
   * Destroys the Durable instance, closing all active subscriber streams
   * and cleaning up local event listeners.
   */
  public destroy() {
    this.#unsubscribe();

    for (const reader of this.#readers.values()) {
      reader.cancel();
    }

    this.#readers.clear();
    this.#publishers.clear();
    this.#subscribers.clear();
  }
}

/**
 * Represents the localized state of a client connected to a Durable Object.
 *
 * @template T The type of the data object.
 */
export type DurableState<T> = {
  /**
   * The synchronized data object.
   */
  data: T;

  /**
   * Closes the connection and cleans up local listeners.
   */
  destroy: () => void;
};

export type DurableAdapter = {
  get(name: string, binding?: string): DurableBridge;
};

/**
 * A factory interface for creating and connecting to Durable instances.
 */
export interface DurableFactory {
  /**
   * Creates a new local Durable instance.
   *
   * @template T The type of the data object.
   * @param init The initial data state.
   * @returns A new Durable instance.
   */
  <T extends Record<string, AnyType>>(init: T): Durable<T>;

  /**
   * Uses an adapter to retrieve Durable instances.
   *
   * @param adapter The adapter to use for retrieving Durable instances.
   */
  use(adapter: DurableAdapter): void;

  /**
   * Retrieves a Durable instance by its globally unique identifier.
   *
   * @template T The type of the data object.
   * @param id The unique identifier of the Durable Object.
   * @param namespace The namespace of the Durable Object. Defaults to 'global'.
   * @param bindingKey The binding key to use for retrieving the Durable instance from ENV. Defaults to 'DURABLE'.
   * @returns A Promise that resolves to the DurableState.
   */
  get<T extends Record<string, AnyType>>(id: string, namespace?: string, bindingKey?: string): Promise<DurableState<T>>;

  /**
   * Connects to a remote Durable Object bridge and synchronizes state bidirectionally.
   *
   * @template T The type of the data object.
   * @param id The unique identifier for this client.
   * @param bridge The bridge connection to the remote Durable Object.
   * @returns A Promise that resolves to the synchronized DurableState.
   */
  from<T extends Record<string, AnyType>>(bridge: DurableBridge, id: string): Promise<DurableState<T>>;

  /**
   * Generates a fully qualified URI key for a Durable Object.
   * By default, it generates a unique ID within the 'global' namespace.
   *
   * @param id The unique identifier. Defaults to a newly generated UUID.
   * @param namespace The namespace prefix. Defaults to 'global'.
   * @returns The namespaced connection key (e.g., `namespace://id`).
   */
  key(id?: string, namespace?: string): string;

  /**
   * Generates a unique, cryptographically strong UUID.
   *
   * @returns A standard v4 UUID string.
   */
  uuid(): string;
}

export type DurableStateEntry = {
  state: DurableState<AnyType>;
  listeners: number;
};
const DURABLE_REGISTRY = new Map<string, DurableStateEntry>();

const durableFn = ((init) => {
  return new Durable(init);
}) as DurableFactory;

durableFn.from = async <T>(bridge: DurableBridge, id: string) => {
  if (DURABLE_REGISTRY.has(id)) {
    const entry = DURABLE_REGISTRY.get(id)!;
    entry.listeners++;
    return entry.state as DurableState<T>;
  }

  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

  const state = safeRun(() => {
    return mutable({
      data: {},
      destroy: () => {
        const entry = DURABLE_REGISTRY.get(id);
        if (entry) {
          entry.listeners--;
          if (entry.listeners) return;
        }

        isListening = false;
        reader?.cancel();
        unsubscribe();
        DURABLE_REGISTRY.delete(id);
      },
    });
  });

  DURABLE_REGISTRY.set(id, { state, listeners: 1 });

  let isUpdating = false;
  let isListening = false;

  const unsubscribe = subscribe(state, (_, event) => {
    if (event.type === 'init') return;
    if (!isUpdating) bridge.replay({ ...event, prev: undefined }, id);
  });

  const listen = async () => {
    isListening = true;

    try {
      while (isListening) {
        const { done, value } = await reader!.read();

        if (done) break;

        const events = decode(value as Uint8Array);

        for (const event of events) {
          apply(state, event);
        }
      }
    } finally {
      isListening = false;
      unsubscribe();
      DURABLE_REGISTRY.delete(id);
    }
  };

  const decoder = new TextDecoder();
  let buffer = '';

  const decode = (value: Uint8Array) => {
    buffer = decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n');
    buffer = chunks.pop() || '';

    return chunks
      .map((c) => {
        try {
          return JSON.parse(c) as StateChange;
        } catch {
          return null;
        }
      })
      .filter(Boolean) as StateChange[];
  };

  const apply = <T>(state: { data: T }, e: StateChange) => {
    isUpdating = true;
    if (e.type === 'init') {
      state.data = e.value as T;
    } else {
      replay(state, { ...e, prev: undefined });
    }
    isUpdating = false;
  };

  const res = await bridge.subscribe(id);
  if (!res.ok || !(res.body instanceof ReadableStream)) return state as DurableState<T>;

  reader = res.body!.getReader();

  const { done, value } = await reader.read();
  const events = decode(value as Uint8Array);

  for (const event of events) {
    apply(state, event);
  }

  if (!done) {
    listen();
  }

  return state as DurableState<T>;
};

let durableAdapter: DurableAdapter | undefined;

durableFn.use = (adapter) => {
  durableAdapter = adapter;
};

durableFn.get = (id, namespace = 'global', bindingKey) => {
  if (!durableAdapter) throw new Error('No durable adapter is provided. Please use durable.use(adapter).');

  const key = durable.key(id, namespace);
  const bridge = durableAdapter.get(namespace, bindingKey);

  return durable.from(bridge, key);
};

durableFn.key = (id = uuid(), namespace = 'global') => {
  return `${namespace}://${id}`;
};

durableFn.uuid = () => {
  return uuid();
};

/**
 * The default Durable factory instance.
 */
export const durable = durableFn as DurableFactory;

const encoder = new TextEncoder();
const encode = (event: StateChange) => {
  return encoder.encode(`${JSON.stringify(event)}\n`);
};
