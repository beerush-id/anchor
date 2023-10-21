export type Getter<T> = () => T;
export type Setter<T> = (newValue: T) => void;
export type Subscriber<T> = (value: T) => void;
export type Unsubscribe = () => void;
export type Subscribe<T> = (callback: Subscriber<T>) => Unsubscribe;
export type Destroy = () => void;

const signals = new Map<number, unknown>();
let signalIndex = 0;

const signalContexts = new Map<unknown, Array<null>>();

let currentContext: unknown = undefined;
let currentSubscriber: Subscriber<unknown> | undefined;

export function createSignal<T>(init: T) {
  if (!currentContext) {
    throw new Error('Cannot create signal outside of context!');
  }

  const context = signalContexts.get(currentContext);
  if (!context) {
    throw new Error('Cannot create signal outside of context!');
  }

  const index = context.length;
  context.push(null);

  if (!signals.has(index)) {
    signals.set(index, init);
  }

  let value: T = signals.get(index) as T;
  const subscribers = new Set<(value: T) => void>();

  const set: Setter<T> = (newValue: T) => {
    if (newValue === value) return;

    value = init;
    subscribers.forEach(emit => emit(value));
  };

  const subscribe: Subscribe<T> = (callback: Subscriber<T>) => {
    subscribers.add(callback);

    return () => {
      subscribers.delete(callback);
    };
  };

  const destroy: Destroy = () => {
    subscribers.clear();
    signals.delete(signalIndex);
  };

  return [ value, set, subscribe, destroy ] as const;
}

export function createContext(fn: () => Unsubscribe): void {
  currentContext = fn;
  const context: null[] = [];
  signalContexts.set(currentContext, context);

  fn();

  currentContext = undefined;
}

export type Ref<T> = {
  current: T;
}

const contexts = new Map<unknown, Map<number, Ref<unknown>>>();
let referer: unknown = undefined;
let refIndex = 0;

export function createRef<T>(init: T): Ref<T> {
  if (!referer) {
    throw new Error('Cannot create ref outside of context!');
  }

  refIndex += 1;

  let context = contexts.get(referer);
  if (!context) {
    context = new Map();
    contexts.set(referer, context);
  }

  context.set(refIndex, { current: init } as Ref<T>);

  return context.get(refIndex) as Ref<T>;
}

export function createEffect<T>(callback: (value: T) => void, value: Getter<T>) {

}

export function setContext(value: unknown) {
  referer = value as never;
}
