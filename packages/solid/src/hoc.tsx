import {
  $symbol,
  type AnyType,
  type AsyncKey,
  AsyncStore,
  CONTEXT_STORE,
  getContextStore,
  isFunction,
} from '@airlib/core';
import { type Component, getOwner, type JSX, type Owner } from 'solid-js';
import { proxyProps, setCurrentProps } from './props.js';
import type {
  BindableComponentProps,
  BindableProps,
  ComponentSlots,
  ComponentWithSnippet,
  SlottedComponent,
} from './types.js';

export type BindableComponent<P> = (props: P) => JSX.Element;

/**
 * @deprecated Use `setup` instead.
 * Creates a bindable component.
 *
 * @param Component - The component to wrap.
 * @returns Bindable component.
 */
// biome-ignore lint/suspicious/noExplicitAny: library
export function bindable<P extends Record<string, any>>(
  Component: Component<BindableComponentProps<P>>
): BindableComponent<BindableProps<P>> {
  const Bindable = (props: BindableComponentProps<P>) => {
    const bindableProps = proxyProps(props);
    return Component(bindableProps as never);
  };

  return Bindable as never;
}

export const SETUP_NAME = $symbol('hoc-setup');
export const STORE_SYMBOL = $symbol('hoc-store');
const COMPONENT_SNIPPET_KEY = $symbol('component-snippet');

type ContextOwner = Owner & {
  [SETUP_NAME]: string;
  [STORE_SYMBOL]: AsyncStore;
  owner?: ContextOwner;
};

/**
 * Creates a bindable component with slot support that initializes a new {@link AsyncStore} in the current owner context.
 *
 * @param Component - The component with snippets to wrap.
 * @param displayName - The display name of the component.
 * @returns Slotted component.
 */
// biome-ignore lint/suspicious/noExplicitAny: library
export function setup<P extends Record<string, any>, S extends ComponentSlots>(
  Component: ComponentWithSnippet<P, S>,
  displayName?: string
): SlottedComponent<P, S>;

/**
 * Creates a bindable component that initializes a new {@link AsyncStore} in the current owner context.
 * This allows the component and its children to have their own scoped context store.
 *
 * @param Component - The component to wrap.
 * @param displayName - The display name of the component.
 * @returns Bindable component.
 */
// biome-ignore lint/suspicious/noExplicitAny: library
export function setup<P extends Record<string, any>>(
  Component: Component<BindableComponentProps<P>>,
  displayName?: string
): BindableComponent<BindableProps<P>>;

/**
 * Creates a bindable component that initializes a new {@link AsyncStore} in the current owner context.
 *
 * @param Component - The component to wrap.
 * @param displayName - The display name of the component.
 * @returns Bindable component.
 */
// biome-ignore lint/suspicious/noExplicitAny: library
export function setup<P extends Record<string, any>, S extends ComponentSlots>(
  Component: Component<BindableComponentProps<P>> | ComponentWithSnippet<P, S>,
  displayName?: string
): BindableComponent<BindableProps<P>> {
  const Setup = (props: BindableComponentProps<P>) => {
    const bindableProps = proxyProps(props);
    setCurrentProps(bindableProps);

    const self = getOwner() as ContextOwner;
    const name = displayName || Component.name || 'Anonymous';

    if (self) {
      self[STORE_SYMBOL] = new AsyncStore([[SETUP_NAME, name]], nearestStore());
      self[SETUP_NAME] = name;
    }

    const slots = findSlots((props as AnyType).children);
    return (Component as ComponentWithSnippet<P, S>)(bindableProps as never, slots as never);
  };

  const SetupSlot = (props: AnyType) => {
    return Object.assign(() => null, { [COMPONENT_SNIPPET_KEY]: true, props });
  };
  SetupSlot.displayName = `Snippet(${displayName || Component.name || 'Anonymous'})`;

  Object.assign(SetupSlot, { [COMPONENT_SNIPPET_KEY]: true });
  Object.assign(Setup, { Snippet: SetupSlot });

  return Setup as never;
}

function findSlots(children: unknown) {
  if (!children) return {} as ComponentSlots;
  let resolved: unknown = children;
  if (typeof children === 'function' && children.length === 0) {
    try {
      resolved = (children as () => unknown)();
    } catch {
      return {} as ComponentSlots;
    }
  }
  const nodes = Array.isArray(resolved) ? resolved : [resolved];
  const slots = {} as ComponentSlots;

  for (const node of nodes.flat(Infinity).filter(Boolean)) {
    const props = (node as AnyType)?.props;
    if ((node as AnyType)?.[COMPONENT_SNIPPET_KEY] && props?.for && isFunction(props.children)) {
      slots[props.for] = props.children;
    }
  }

  return slots;
}

/**
 * Traverses up the owner tree to find the nearest {@link AsyncStore}.
 * Falls back to the global context store if no store is found in the hierarchy.
 *
 * @param from - The starting owner to search from.
 * @returns The nearest async store.
 */
function nearestStore(from: ContextOwner = getOwner() as ContextOwner): AsyncStore {
  if (!from) return getContextStore();

  if (from[STORE_SYMBOL]) return from[STORE_SYMBOL] as AsyncStore;
  if (from.owner) return nearestStore(from.owner);

  return getContextStore();
}

/**
 * Retrieves a value from the nearest owner's context store.
 *
 * @param key - The key to look up.
 * @param fallback - The value to return if the key is not found.
 * @returns The value associated with the key or the fallback.
 */
function getOwnerCtx(key: AsyncKey, fallback?: unknown) {
  const value = nearestStore().get(key);
  return typeof value !== 'undefined' ? value : fallback;
}

/**
 * Sets a value in the nearest owner's context store.
 *
 * @param key - The key to set.
 * @param value - The value to store.
 */
function setOwnerCtx(key: AsyncKey, value: unknown) {
  nearestStore().set(key, value);
}

CONTEXT_STORE.get = getOwnerCtx;
CONTEXT_STORE.set = setOwnerCtx;
