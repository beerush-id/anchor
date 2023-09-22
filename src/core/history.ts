import type { ArrayAction, Init, State, StateEvent, Unsubscribe } from './anchor.js';
import { ARRAY_MUTATIONS, INTERNAL_KEY } from './anchor.js';
import { merge, write } from '@beerush/utils';

export type StateChanges<T> = Partial<T> | Partial<T>[];
export type HistorySubscriber<T extends Init> = (history: History<T>, event: HistoryEvent<T>) => void;
export type HistoryEvent<T extends Init> = {
  type: 'init' | 'change' | 'undo' | 'redo' | 'clear' | 'revert';
  value?: StateChanges<T>;
}

const queueMap = new WeakMap<History<Init>, Map<string, number>>();
const valueMap = new WeakMap<History<Init>, Map<string, unknown>>();
const subscriptionMap = new WeakMap<History<Init>, Unsubscribe>();

export class History<T extends Init> {
  public changes: StateChanges<T> = Array.isArray(this.state) ? [] : {};
  public excludes: Array<keyof T> = [];

  private paused = false;
  private readonly backwards: StateEvent<T>[] = [];
  private readonly forwards: StateEvent<T>[] = [];
  private readonly subscribers: HistorySubscriber<T>[] = [];

  get canUndo(): boolean {
    return !!this.backwards.length;
  }

  get canRedo(): boolean {
    return !!this.forwards.length;
  }

  constructor(public state: State<T>, private max = 50, private debounce = 1000) {
    const unsubscribe = this.state.subscribe?.((s, e) => {
      if (!e) {
        return;
      }

      if (e.path) {
        write(this.changes, e.path as never, e.value as never);
      } else if (Array.isArray(this.changes) && ARRAY_MUTATIONS.includes(e.type as ArrayAction)) {
        this.changes.splice(0, this.changes.length, ...(e.value as Partial<T>[]));
      } else if (e.type === 'update') {
        merge(this.changes, e.value as never);
      }

      for (const path of this.excludes) {
        if (e.path?.startsWith(path as never)) {
          return;
        }
      }

      if (!this.paused) {
        const queues = queueMap.get(this as never) ?? new Map<string, number>();
        const values = valueMap.get(this as never) ?? new Map<string, unknown>();

        const key = e.path || e.type;

        if (queues.has(key)) {
          clearTimeout(queues.get(key));
        } else {
          values.set(key, e.oldValue);
        }

        queues.set(key, setTimeout(() => {
          const oldValue = values.get(key);

          if (this.backwards.length >= this.max) {
            this.backwards.shift();
          }

          this.backwards.push({ ...e, oldValue } as never);
          this.forwards.splice(0, this.forwards.length);

          queues.delete(key as never);
          values.delete(key as never);

          this.publish({ type: 'change', value: this.changes });
        }, this.debounce) as never);
      }
    }, false, INTERNAL_KEY);

    queueMap.set(this as never, new Map<string, number>());
    valueMap.set(this as never, new Map<string, unknown>());

    subscriptionMap.set(this as never, unsubscribe);
  }

  public undo(length?: number) {
    if (length) {
      for (let i = 0; i < length; i++) {
        this.undo();
      }

      return;
    }

    if (this.backwards.length) {
      this.paused = true;

      const event = this.backwards.pop();

      if (event?.path) {
        write(this.state, event.path as never, event.oldValue as never);
        this.forwards.unshift(event as never);
      } else if (Array.isArray(this.state) && ARRAY_MUTATIONS.includes(event?.type as ArrayAction)) {
        this.state.splice(0, this.state.length, ...(event?.oldValue as never[]));
        this.forwards.unshift(event as never);
      } else if (event?.type === 'update') {
        merge(this.state, event.oldValue as never);
        this.forwards.unshift(event as never);
      }

      this.paused = false;
      this.publish({ type: 'undo', value: this.changes });
    }
  }

  public redo(length?: number) {
    if (length) {
      for (let i = 0; i < length; i++) {
        this.redo();
      }

      return;
    }

    if (this.forwards.length) {
      this.paused = true;

      const event = this.forwards.shift();

      if (event?.path) {
        write(this.state, event.path as never, event.value as never);
        this.backwards.push(event as never);
      } else if (Array.isArray(this.state) && ARRAY_MUTATIONS.includes(event?.type as ArrayAction)) {
        this.state.splice(0, this.state.length, ...(event?.value as never[]));
        this.backwards.push(event as never);
      } else if (event?.type === 'update') {
        merge(this.state, event.value as never);
        this.backwards.push(event as never);
      }

      this.paused = false;
      this.publish({ type: 'redo', value: this.changes });
    }
  }

  public clear() {
    this.changes = Array.isArray(this.changes) ? [] : {};
    this.forwards.splice(0, this.forwards.length);
    this.backwards.splice(0, this.backwards.length);
    this.publish({ type: 'clear', value: this.changes });
  }

  public revert() {
    this.undo(this.forwards.length);
    this.clear();
    this.publish({ type: 'revert', value: this.changes });
  }

  public destroy() {
    this.clear();

    const unsubscribe = subscriptionMap.get(this as never);
    if (typeof unsubscribe === 'function') {
      unsubscribe();
    }
  }

  public publish(event: HistoryEvent<T>) {
    for (const subscriber of this.subscribers) {
      subscriber(this, event);
    }
  }

  public subscribe(run: HistorySubscriber<T>, emit = true): Unsubscribe {
    if (emit) {
      run(this, { type: 'init', value: this.changes });
    }

    this.subscribers.push(run);

    return () => {
      const index = this.subscribers.indexOf(run);

      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }
}

export function history<T extends Init>(state: State<T>, max = 50, debounce = 1000): History<T> {
  return new History(state, max, debounce);
}
