import type { ZodType } from 'zod/v4';
import { broadcast, linkable } from './utils.js';
import { STATE_BUSY_LIST, STATE_REGISTRY } from './registry.js';
import type { Linkable, SetTrapOptions, StateKey, StateMutation } from './types.js';

export function wrapMethods<T extends Set<Linkable> | Map<string, Linkable>, S extends ZodType>({
  init,
  link,
  cloned,
  strict,
  unlink,
  anchor,
  deferred,
  recursive,
  subscribers,
  subscriptions,
}: SetTrapOptions<T, S>) {
  if (init instanceof Map && recursive && deferred) {
    const setFn = (init as Map<string, unknown>).set;
    const getFn = init.get as (key: string) => unknown;

    Object.assign(init, {
      get: (key: string) => {
        let value = getFn.call(init, key);

        if (!STATE_REGISTRY.has(value as Linkable) && linkable(value)) {
          value = anchor(value, {
            deferred,
            recursive,
            cloned,
            strict,
          });

          setFn?.call(init, key, value);
        }

        if (STATE_REGISTRY.has(value as Linkable) && subscribers.size) {
          link(key, value as never);
        }

        return value;
      },
    });
  }

  for (const method of ['set', 'add']) {
    const methodFn = init[method as never] as (...args: unknown[]) => unknown;

    Object.assign(init, {
      [method]: (keyValue: string, value?: Linkable) => {
        const oldValue = init instanceof Map ? init.get(keyValue) : undefined;
        let newValue = (method === 'set' ? value : keyValue) as Linkable;

        if (!STATE_REGISTRY.has(newValue) && recursive && linkable(newValue) && !deferred) {
          newValue = anchor(newValue, { deferred, recursive, cloned, strict });
        }

        const result = methodFn.apply(init, method === 'set' ? [keyValue, newValue] : [newValue]);

        if (STATE_REGISTRY.has(newValue) && subscribers.size && recursive && !deferred) {
          link(method === 'set' ? keyValue : '', newValue as never);
        }

        if (oldValue && subscriptions.has(oldValue)) {
          unlink(oldValue as Linkable);
        }

        if (!STATE_BUSY_LIST.has(init)) {
          broadcast(subscribers, init, {
            type: method as StateMutation,
            prev: oldValue,
            keys: method === 'set' ? [keyValue] : [],
            value: newValue,
          });
        }

        return result;
      },
    });
  }

  for (const method of ['delete', 'clear']) {
    const methodFn = init[method as never] as (...args: unknown[]) => unknown;

    if (typeof methodFn !== 'function') continue;

    Object.assign(init, {
      [method]: (keyValue?: unknown) => {
        const self = init as Set<Linkable> | Map<unknown, Linkable>;

        if (method === 'delete') {
          const current = (self instanceof Set ? keyValue : self.get(keyValue)) as Linkable;
          const result = methodFn.apply(self, [keyValue]);

          if (current && subscriptions.has(current)) {
            unlink(current as Linkable);
          }

          broadcast(subscribers, self, {
            type: method,
            prev: current,
            keys: self instanceof Map ? [keyValue as string] : [],
          });

          return result;
        }

        if (method === 'clear') {
          const entries = [...self.entries()].map(([key, value]) => ({ key, value }));
          const values = entries.map((item) => item.value);
          const result = methodFn.apply(self, []);

          if (recursive) {
            for (const value of values) {
              if (subscriptions.has(value)) {
                unlink(value);
              }
            }
          }

          broadcast(subscribers, init, {
            type: method,
            prev: self instanceof Map ? entries : values,
            keys: self instanceof Map ? (entries.map((item) => item.key) as StateKey[]) : [],
          });

          return result;
        }
      },
    });
  }
}
