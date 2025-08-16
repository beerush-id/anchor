import type { ZodType } from 'zod/v4';
import { createGetter, createRemover, createSetter } from './trap.js';
import type {
  KeyLike,
  Linkable,
  MethodLike,
  MutablePart,
  MutationKey,
  ObjLike,
  StatePropGetter,
  StateReferences,
} from './types.js';
import { createCollectionMutator } from './collection.js';
import { REFERENCE_REGISTRY, REFLECT_REGISTRY } from './registry.js';
import { createArrayMutator } from './array.js';
import { captureStack } from './exception.js';

export function createProxyHandler<T>(init: T, references: StateReferences<T, ZodType>) {
  const { immutable } = references.configs;
  // const { recursive, deferred, immutable } = configs;

  const getter = createGetter(init);
  references.getter = getter as StatePropGetter;
  // const getter = recursive && deferred ? createGetter(init) : undefined;

  if (immutable) {
    const handler = {
      get: getter,
      set: (target: Linkable, prop: KeyLike) => {
        captureStack.violation.setter(prop, handler.set);
        return true;
      },
      deleteProperty: (target: Linkable, prop: KeyLike) => {
        captureStack.violation.remover(prop, handler.deleteProperty);
        return true;
      },
    } as ProxyHandler<ObjLike>;

    return handler;
  }

  return {
    get: getter,
    set: createSetter(init),
    deleteProperty: createRemover(init),
  } as ProxyHandler<ObjLike>;
}

export const writeContract = <T, K extends MutationKey<T>[]>(state: T, contracts?: K): MutablePart<T, K> => {
  const init = REFLECT_REGISTRY.get(state as WeakKey) as Linkable;

  if (typeof init === 'undefined') {
    captureStack.contractViolation.init(writeContract);
    return state as MutablePart<T, K>;
  }

  const references = REFERENCE_REGISTRY.get(init as WeakKey) as StateReferences<unknown, ZodType>;
  const newOptions = {
    ...references,
    configs: {
      ...references.configs,
      cloned: false,
      immutable: false,
      recursive: false,
    },
  };

  if (Array.isArray(init)) {
    newOptions.mutator = createArrayMutator(init, newOptions);
  } else if (init instanceof Map || init instanceof Set) {
    newOptions.mutator = createCollectionMutator(init as Set<Linkable>, newOptions);
  }

  const getter = createGetter(init, newOptions);
  const setter = createSetter(init, newOptions);
  const remover = createRemover(init, newOptions);

  const mutator = newOptions.mutator as WeakMap<WeakKey, (...args: unknown[]) => void>;
  const allowList = Array.isArray(contracts) ? new Set(contracts) : undefined;

  const handler = {
    get(target: ObjLike, prop: KeyLike, receiver?: unknown) {
      if (mutator?.has(init[prop as never])) {
        if (allowList && !allowList.has(prop as never)) {
          captureStack.contractViolation.methodRead(prop, handler.get);

          const mockFn: MethodLike = (
            Array.isArray(init) ? createArrayMutator.mock[prop as never] : createCollectionMutator.mock[prop as never]
          ) as never;

          return (...args: unknown[]) => {
            return mockFn?.(proxied, ...args);
          };
        }

        const valueFn = getter(target, prop, receiver) as MethodLike;
        return (...args: unknown[]) => {
          const result = valueFn(...args);

          if (result === state) {
            return proxied;
          }

          return result;
        };
      }

      return references.getter?.(target, prop as never, receiver);
    },
    set(target: ObjLike, prop: KeyLike, value: Linkable, receiver?: unknown) {
      if (allowList && !allowList.has(prop as never)) {
        captureStack.contractViolation.setter(prop, handler.set);
        return true;
      }

      return setter(target, prop, value, receiver);
    },
    deleteProperty(target: ObjLike, prop: KeyLike, receiver?: unknown) {
      if (allowList && !allowList.has(prop as never)) {
        captureStack.contractViolation.remover(prop, handler.deleteProperty);
        return true;
      }

      return remover(target, prop, receiver);
    },
  };

  const proxied = new Proxy(init, handler) as MutablePart<T, K>;

  return proxied;
};
