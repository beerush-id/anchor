import { captureStack } from '../shared/index.js';
import type {
  AnyType,
  KeyLike,
  Linkable,
  MethodLike,
  MutablePart,
  MutationKey,
  ObjLike,
  StateController,
  StateGateway,
  StateMetadata,
  StatePropGetter,
  TrapOverrides,
} from '../types.js';
import { createArrayMutator } from './array.js';
import { createCollectionMutator } from './collection.js';
import { CONTROLLER_REGISTRY, INIT_GATEWAY_REGISTRY, META_REGISTRY, STATE_REGISTRY } from './registry.js';
import { createGetter } from './trap.js';

/**
 * Creates a ProxyHandler for the given state object based on its mutability configuration.
 *
 * This function generates a proxy handler that either enforces immutability (by capturing
 * violations when attempting to set or delete properties) or allows mutations through
 * appropriate setter and remover functions. The handler is used to create a proxy that
 * wraps the initial state object.
 *
 * @template T - The type of the state object
 * @param gateway - The gateway object containing the state object and its mutator
 * @param meta - The metadata object associated with the state object
 * @returns A ProxyHandler configured according to the immutability settings
 */
export function createProxyHandler<T extends Linkable>(gateway: StateGateway<T>, meta: StateMetadata<T>) {
  const { immutable } = meta.configs;

  if (immutable) {
    const handler = {
      get: gateway.getter,
      set: (_target: Linkable, prop: KeyLike) => {
        captureStack.violation.setter(prop, handler.set);
        return true;
      },
      ownKeys: gateway.ownKeys,
      deleteProperty: (_target: Linkable, prop: KeyLike) => {
        captureStack.violation.remover(prop, handler.deleteProperty);
        return true;
      },
    } as ProxyHandler<ObjLike>;

    return handler;
  }

  return {
    get: gateway.getter,
    set: gateway.setter,
    ownKeys: gateway.ownKeys,
    deleteProperty: gateway.remover,
  } as ProxyHandler<Linkable>;
}

/**
 * Creates a mutable proxy of an immutable state with optional contract restrictions.
 *
 * This function takes an immutable state and returns a mutable proxy that allows controlled
 * mutations based on the provided contract. If no contract is provided, all mutations are allowed.
 * The proxy maintains the same interface as the original state but enforces contract violations
 * when accessing or modifying properties not listed in the contract.
 *
 * @template T - The type of the state object
 * @template K - The type of the mutation key array
 * @param state - The immutable state to create a mutable proxy for
 * @param contracts - Optional array of allowed mutation keys
 * @returns A mutable proxy of the state with contract enforcement
 */
export const writeContract = <T extends Linkable, K extends MutationKey<T>[]>(
  state: T,
  contracts?: K
): MutablePart<T, K> => {
  const init = STATE_REGISTRY.get(state) as Linkable;

  if (typeof init === 'undefined') {
    captureStack.contractViolation.init(writeContract);
    return state as MutablePart<T, K>;
  }

  const meta = META_REGISTRY.get(init) as StateMetadata;
  const gateway = INIT_GATEWAY_REGISTRY.get(init) as StateGateway;
  const controller = CONTROLLER_REGISTRY.get(state) as StateController;
  const newOptions = {
    configs: {
      ...meta.configs,
      immutable: false,
      recursive: false,
    },
  } as TrapOverrides;

  if (Array.isArray(init)) {
    newOptions.mutator = createArrayMutator(init, newOptions as TrapOverrides).mutatorMap;
  } else if (init instanceof Map || init instanceof Set) {
    newOptions.mutator = createCollectionMutator(init as Set<Linkable>, newOptions as TrapOverrides).mutatorMap;
  }

  const getter = createGetter(init, newOptions) as StatePropGetter;
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

        const valueFn = getter(target, prop as never, receiver) as MethodLike;
        return (...args: unknown[]) => {
          const result = valueFn(...args);

          if (result === state) {
            return proxied;
          }

          return result;
        };
      }

      return gateway.getter(target, prop as never, receiver);
    },
    set(target: ObjLike, prop: KeyLike, value: Linkable, receiver?: unknown) {
      if (allowList && !allowList.has(prop as never)) {
        captureStack.contractViolation.setter(prop, handler.set);
        return true;
      }

      return gateway.setter(target, prop, value, receiver);
    },
    deleteProperty(target: ObjLike, prop: KeyLike, receiver?: unknown) {
      if (allowList && !allowList.has(prop as never)) {
        captureStack.contractViolation.remover(prop, handler.deleteProperty);
        return true;
      }

      return gateway.remover(target, prop, receiver);
    },
  };

  const proxied = new Proxy(init, handler as ProxyHandler<T>) as MutablePart<T, K>;
  CONTROLLER_REGISTRY.set(proxied, controller);

  return proxied;
};

/**
 * Inherits properties from multiple sources with zero copy overhead.
 * - When reading a property, it will look through the sources in reverse order
 * and return the first one that has the property.
 * - When setting a property, it will set it on the last source.
 * - Each nullish source will be converted to an empty object, and write goes to the last source.
 *
 * @param sources - The sources to inherit from
 * @returns A proxy object that inherits from the sources
 */
export function inherit<T extends Record<string, AnyType>>(...sources: (Partial<T> | null | undefined)[]): T {
  const targets = sources.map((s) => s ?? {}).reverse();

  return new Proxy(
    {},
    {
      get(_, prop) {
        const values = targets.map((t) => (t as T)[prop as keyof T]);
        const value = values.find((v) => typeof v !== 'undefined');
        if (typeof value !== 'undefined') {
          return value && typeof value === 'object' ? inherit(...values.reverse()) : value;
        }
      },
      set(_, prop, value) {
        if (!targets?.length) return true;
        (targets[0] as T)[prop as keyof T] = value as T[keyof T];
        return true;
      },
      deleteProperty(_, prop) {
        if (!targets?.length) return true;
        delete (targets[0] as T)[prop as string];
        return true;
      },
      has(_target, prop) {
        return targets.some((t) => prop in t);
      },
      ownKeys() {
        const keys = new Set<string>();

        for (const target of targets) {
          for (const key of Object.keys(target)) {
            keys.add(key);
          }
        }

        return Array.from(keys);
      },
      getOwnPropertyDescriptor(_, prop) {
        const target = targets.find((t) => prop in t);
        if (target) {
          return (
            Object.getOwnPropertyDescriptor(target, prop) ?? {
              configurable: true,
              enumerable: true,
              writable: true,
              value: (target as T)[prop as keyof T],
            }
          );
        }
      },
    }
  ) as T;
}
