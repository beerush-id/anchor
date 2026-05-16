import { getContext, setContext } from '@anchorlib/core';
import type { ReactNode } from 'react';
import { render, setup, snippet } from './hoc.js';

export type SlotProps<K> = {
  for: K;
  children?: ReactNode | (() => ReactNode);
};

export type SlotNode<K> = (props: SlotProps<K>) => ReactNode;

export type SwitchProps<T> = {
  for: T;
  children?: ReactNode;
};

export type SwitchNode<T, K> = ((props: SwitchProps<T>) => ReactNode) & {
  displayName: string;
  Slot: SlotNode<K>;
};

/**
 * Creates a Slot component that conditionally renders its children based on a context value.
 *
 * @param ctx - The context key to retrieve the state from.
 * @param key - The property key within the state to compare against.
 * @param displayName - Optional display name for the component.
 * @returns A Slot component.
 */
export function createSlot<K>(ctx: string | symbol, key: string | symbol, displayName = 'Anonymous') {
  return snippet<SlotProps<string>>(
    (props) => {
      const state = getContext(ctx) as Record<string, unknown>;
      if (!state) return '<>[Slot Error: Slot rendered outside of Switch]</>';
      const children = typeof props.children === 'function' ? props.children() : props.children;
      return state[key as string] === props.for ? children : null;
    },
    displayName,
    'Slot',
    false
  ) as SlotNode<K>;
}

/**
 * Creates a Switch component and an associated Slot component for conditional rendering.
 *
 * @param ctx - The context key to store the switch state.
 * @param key - The property key within the state that Slots will check.
 * @param displayName - Optional display name for the Switch component.
 * @param scopeName - Optional scope name for the display name (defaults to 'Switch').
 * @returns A Switch component with a static Slot property.
 */
export function createSwitch<T, K>(
  ctx: string | symbol,
  key: string | symbol,
  displayName = 'Anonymous',
  scopeName = 'Switch'
) {
  const Switch = setup((props) => {
    setContext(ctx, (props as never as SwitchProps<T>).for);
    return render(() => (props as never as SwitchProps<T>).children);
  }, displayName) as SwitchNode<T, K>;

  Switch.displayName = `${scopeName}(${displayName})`;
  Switch.Slot = createSlot<K>(ctx, key, displayName);

  return Switch as SwitchNode<T, K>;
}

export type ShowProps<T> = {
  when: T | (() => T);
  children: ReactNode | ((value: T) => ReactNode);
  fallback?: () => ReactNode;
};

export type ShowNode = <T>(props: ShowProps<T>) => ReactNode;

/**
 * Conditionally renders children based on a truthy condition.
 *
 * @param props.when - The condition to evaluate.
 * @param props.children - The content to render when the condition is truthy.
 * @param props.fallback - Optional content to render when the condition is falsy.
 * @returns The rendered content or null.
 */
export const Show = snippet<ShowProps<boolean>>(
  (props) => {
    const check = typeof props.when === 'function' ? props.when : () => props.when;
    const value = check() as boolean;

    if (value) {
      return typeof props.children === 'function' ? props.children(value) : props.children;
    }

    return typeof props.fallback === 'function' ? props.fallback() : null;
  },
  'Show',
  'Slot',
  false
) as ShowNode;

export type ForProps<T> = {
  each: T[] | (() => T[]) | undefined | null;
  children: (item: T, index: number) => ReactNode;
  fallback?: ReactNode | (() => ReactNode);
};

export type ForNode = <T>(props: ForProps<T>) => ReactNode;

const ForItem = snippet<{ item: unknown; index: number; render: (item: unknown, index: number) => ReactNode }>(
  (props) => props.render(props.item, props.index),
  'ForItem',
  'Slot',
  false
);

const objectKeys = new WeakMap<object, string>();
let nextKeyId = 0;

function getItemKey(item: unknown, index: number) {
  if (typeof item === 'object' && item !== null) {
    let key = objectKeys.get(item);
    if (!key) {
      key = `ok_${++nextKeyId}`;
      objectKeys.set(item, key);
    }
    return key;
  }
  return index;
}

/**
 * Conditionally renders a list of items using a map function.
 *
 * @param props.each - The array or accessor to iterate over.
 * @param props.children - The render function for each item.
 * @param props.fallback - Optional content to render when the array is empty.
 * @returns The rendered list or fallback.
 */
export const For = snippet<ForProps<unknown>>(
  (props) => {
    const check = typeof props.each === 'function' ? props.each : () => props.each;
    const items = check() as unknown[] | undefined | null;

    if (items && items.length > 0) {
      return items.map((item, index) => {
        return <ForItem key={getItemKey(item, index)} item={item} index={index} render={props.children} />;
      });
    }

    return typeof props.fallback === 'function' ? props.fallback() : props.fallback || null;
  },
  'For',
  'Slot',
  false
) as ForNode;
