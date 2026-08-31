import {
  $symbol,
  type AnyType,
  type AsyncKey,
  AsyncStore,
  CONTEXT_STORE,
  captureStack,
  getContextStore,
  isFunction,
  setStaticTracker,
  untrack,
} from '@airlib/core';
import { type Accessor, type Component, createMemo, getOwner, type JSX, type Owner } from 'solid-js';
import { proxyProps, setCurrentProps } from './props.js';
import type {
  BindableComponentProps,
  BindableProps,
  ComponentSlots,
  ComponentView,
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
 * @param controlled - List of controlled keys to not trigger violation warnings.
 * @returns Slotted component.
 */
// biome-ignore lint/suspicious/noExplicitAny: library
export function setup<P extends Record<string, any>, S extends ComponentSlots>(
  Component: ComponentWithSnippet<P, S>,
  displayName?: string,
  controlled?: string[]
): SlottedComponent<P, S>;

/**
 * Creates a bindable component that initializes a new {@link AsyncStore} in the current owner context.
 * This allows the component and its children to have their own scoped context store.
 *
 * @param Component - The component to wrap.
 * @param displayName - The display name of the component.
 * @param controlled - List of controlled keys to not trigger violation warnings.
 * @returns Bindable component.
 */
// biome-ignore lint/suspicious/noExplicitAny: library
export function setup<P extends Record<string, any>>(
  Component: ComponentView<P>,
  displayName?: string,
  controlled?: string[]
): BindableComponent<BindableProps<P>>;

/**
 * Creates a bindable component that initializes a new {@link AsyncStore} in the current owner context.
 *
 * @param Component - The component to wrap.
 * @param displayName - The display name of the component.
 * @param controlled - List of controlled keys to not trigger violation warnings.
 * @returns Bindable component.
 */
// biome-ignore lint/suspicious/noExplicitAny: library
export function setup<P extends Record<string, any>, S extends ComponentSlots>(
  Component: ComponentView<P> | ComponentWithSnippet<P, S>,
  displayName?: string,
  controlled?: string[]
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

    const restore = setStaticTracker((_state, key) => {
      if (controlled?.includes(String(key))) return;

      const error = new Error(`[${name}] Frozen read on "${String(key)}".`);
      captureStack.violation.general(
        'Frozen reactive read detected:',
        `Attempted to read "${String(key)}" inside <${name}> setup() without a reactive boundary.`,
        error,
        [
          `Component setup executes once upon initialization; reads here will not trigger re-renders.`,
          '- Return an accessor function: `return () => <JSX />` instead of static JSX.',
          '- Or isolate dynamic reads inside a `<Snippet>` / reactive boundary.',
          '- If static is expected, wrap with `$static(() => ...)` to silence this warning.',
        ]
      );
    });

    let result: unknown;
    try {
      const slots = untrack(() => findSlots((props as AnyType).children));
      result = (Component as ComponentWithSnippet<P, S>)(bindableProps as never, slots as never);
    } finally {
      restore();
    }

    return typeof result === 'function' ? render(result as never, bindableProps as never) : result;
  };

  const SetupSlot = (props: AnyType) => {
    return Object.assign(() => null, { [COMPONENT_SNIPPET_KEY]: true, props });
  };
  SetupSlot.displayName = `Snippet(${displayName || Component.name || 'Anonymous'})`;

  Object.assign(SetupSlot, { [COMPONENT_SNIPPET_KEY]: true });
  Object.assign(Setup, { Snippet: SetupSlot });

  return Setup as never;
}

/**
 * Creates a memoized reactive JSX element from a view factory function.
 *
 * @param view - Factory function returning a JSX element or an accessor.
 * @param props - The props to pass to the view function.
 * @returns A memoized accessor resolving to the evaluated JSX element.
 */
export function render<P>(view: ((props: P) => JSX.Element) | Accessor<JSX.Element>, props: P): Accessor<JSX.Element> {
  return createMemo(() => view(props));
}

/**
 * Resolves dynamic child nodes or accessor functions into evaluated JSX elements.
 * Invokes the accessor/render-prop with optional arguments, or returns the static element directly.
 * Catches runtime execution errors and returns an error diagnostic string.
 *
 * @param children - Static JSX element or an accessor/render function returning a JSX element.
 * @param args - Arguments to pass when `children` is a function.
 * @returns The resolved JSX element or an error diagnostic string.
 */
export function renderDynamic(
  children: Accessor<JSX.Element> | ((...args: AnyType[]) => JSX.Element) | JSX.Element,
  ...args: AnyType[]
): JSX.Element {
  if (typeof children === 'function') {
    try {
      return (children as (...args: AnyType[]) => JSX.Element)(...args);
    } catch (error) {
      return `[Render Error]: Failed to render dynamic: ${(error as Error).message}`;
    }
  }
  return children;
}

/**
 * Extracts named component snippets (slots) from component children.
 * Resolves child accessors if needed, flattens the node hierarchy, and maps snippet functions by their target slot name.
 *
 * @param children - The children or child accessor to inspect for snippets.
 * @returns A record mapping slot names to snippet render functions.
 */
function findSlots(children: unknown): ComponentSlots {
  if (!children) return {} as ComponentSlots;
  let resolved: unknown = children;
  if (typeof children === 'function' && children.length === 0) {
    try {
      resolved = (children as () => unknown)();
    } catch {
      /* istanbul ignore next */
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
