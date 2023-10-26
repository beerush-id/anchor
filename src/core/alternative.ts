import { Beacon, Init, Part, Quench, SailShift } from './anchor.js';

export type Publisher<T> = (event: SailShift<T>) => void;
export type Readable<T> = T & {
  readonly subscribe: (run: Beacon<T>, emit?: boolean, receiver?: unknown) => Quench;
}
export type Writable<T> = Readable<T> & {
  readonly set: (value: Part<T> | Part<T>[]) => void;
}

export function readable<T extends Init>(init: T): [ Readable<T>, Publisher<T> ] {
  const instance = Array.isArray(init) ? [ ...(init as never[]) ] : { ...init };
  const subscribers: Beacon<T>[] = [];

  const subscribe = (handler: Beacon<T>, emit = true) => {
    if (emit) {
      const event: SailShift<T> = { type: 'init', value: instance, emitter: instance };
      handler(instance as T, event);
    }

    // Store the subscriber to emit events.
    subscribers.push(handler);

    // Return an unsubscribe function.
    return () => {
      const index = subscribers.indexOf(handler);

      if (index > -1) {
        subscribers.splice(index, 1);
      }
    };
  };

  const publish: Publisher<T> = (event: SailShift<T>) => {
    for (const run of subscribers) {
      if (typeof run === 'function') {
        run(instance as T, event);
      }
    }
  };

  Object.defineProperty(instance, 'subscribe', { value: subscribe, enumerable: false });

  return [ instance as Readable<T>, publish ];
}

export function writable<T extends Init>(init: T): [ Writable<T>, Publisher<T> ] {
  const [ instance, publish ] = readable(init);

  const set = (value: Part<T> | Part<T>[], emit = true) => {
    if (Array.isArray(value) && Array.isArray(instance)) {
      instance.splice(0, instance.length, ...(value as never[]));
    } else {
      Object.assign(instance, value);
    }

    if (emit) {
      publish({ type: 'update', value, emitter: instance });
    }
  };

  Object.defineProperty(instance, 'set', { value: set, enumerable: false });

  return [ instance as Writable<T>, publish ];
}
