import type { AnyType } from '@airlib/core';
import type { Component, JSX } from 'solid-js';

/**
 * Collection of named slot renderers provided to a slotted component.
 */
export type ComponentSlots = Record<string, (...args: AnyType[]) => JSX.Element>;

/**
 * Reactive component view function that consumes reactive props and returns view output.
 *
 * @template P Component props type
 * @param props Component props
 * @returns Rendered view
 */
export type ComponentView<P> = (
  props: BindableComponentProps<P>
) => JSX.Element | ((props: BindableComponentProps<P>) => JSX.Element);

/**
 * Component definition that consumes reactive props and slot renderers to produce view output.
 *
 * @template P Component props type
 * @template S Available slot definitions
 * @param props Component props
 * @param snippets Named slot renderers
 * @returns Rendered view
 */
export type ComponentWithSnippet<P, S extends ComponentSlots> = (
  props: BindableComponentProps<P>,
  snippets: S
) => JSX.Element | ((props: BindableComponentProps<P>) => JSX.Element);

/**
 * Target slot identifier and renderer content passed when declaring a snippet.
 *
 * @template S Available slot definitions
 */
export type ComponentSnippetProps<S extends ComponentSlots> = {
  [K in keyof S]: {
    for: K;
    children: S[K];
  };
}[keyof S];

/**
 * Slot container component used to declare and inject snippet content into matching component slots.
 *
 * @template S Available slot definitions
 * @param props Snippet slot mapping and renderer
 * @returns Rendered snippet content
 */
export type ComponentSnippet<S extends ComponentSlots> = (props: ComponentSnippetProps<S>) => JSX.Element;

/**
 * Reactive component supporting declarative slot injection through an attached Snippet component.
 *
 * @template P Component props type
 * @template S Available slot definitions
 */
export interface SlottedComponent<P, S extends ComponentSlots> {
  /**
   * Render the component with reactive props.
   *
   * @param props Reactive component props
   * @returns Rendered view
   */
  (props: BindableProps<P>): JSX.Element;

  /**
   * Component display name for debugging and profiling.
   */
  displayName?: string;

  /**
   * Slot container component used to declare and inject snippet content into matching component slots.
   *
   * @param props Snippet slot mapping and renderer
   * @returns Rendered snippet content
   */
  Snippet: ComponentSnippet<S>;
}

export type StateRef<T> = {
  value: T;
};

export type ConstantRef<T> = {
  get value(): T;
};

export type VariableRef<T> = {
  get value(): T;
  set value(value: T);
};

/**
 * A type alias to create a writable prop inference.
 */
export type Bindable<T> = {
  get value(): T;
  set value(value: T);
};

/**
 * A type alias to create a writable prop inference.
 */
export type BindableProp<T> = T | Bindable<T>;

export type BindableProps<P> = {
  [K in keyof P]: P[K] extends Bindable<infer T> | undefined ? BindableProp<T> : P[K];
};

/**
 * Extracts keys from type P where the value is not a Bindable or undefined
 * Used to identify readonly properties in a component
 *
 * @template P - The props type to extract keys from
 */
export type ReadOnlyPropKeys<P> = {
  [K in keyof P]: P[K] extends Bindable<unknown> | undefined ? never : K;
}[keyof P];

/**
 * Extracts keys from type P where the value is a Bindable or undefined
 * Used to identify writable properties in a component
 *
 * @template P - The props type to extract keys from
 */
export type WritablePropKeys<P> = {
  [K in keyof P]: P[K] extends Bindable<unknown> | undefined ? K : never;
}[keyof P];

/**
 * Creates a type with all properties of P marked as readonly
 *
 * @template P - The props type to make readonly
 */
export type ReadonlyProps<P> = {
  readonly [K in keyof P]: P[K];
};

/**
 * Creates a type with only the Bindable properties of P converted to their bound type
 * Non-Bindable properties are mapped to 'never'
 *
 * @template P - The props type to extract writable properties from
 */
export type WritableProps<P> = {
  [K in keyof P]: P[K] extends Bindable<infer T> | undefined ? T : never;
};

/**
 * Extended component props that include an $omit method for omitting specific keys.
 *
 * @template P - The base props type
 * @property $omit - A method that returns a new object with specified keys omitted
 */
export type BindableComponentProps<P> = Omit<ReadonlyProps<P>, WritablePropKeys<P>> &
  Omit<WritableProps<P>, ReadOnlyPropKeys<P>> & {
    /**
     * Creates a new object with specified keys omitted from the original props.
     * If no keys are provided, returns a copy of all props.
     *
     * @template K - The keys to omit from props
     * @param keys - Optional array of keys to omit
     * @returns A new object with specified keys removed
     */
    $omit<K extends keyof P>(keys?: Array<K>): Omit<P, K>;

    /**
     * Creates a new object containing only the specified keys from the original props.
     * If no keys are provided, returns an empty object.
     *
     * @template K - The keys to pick from props
     * @param keys - Optional array of keys to include
     * @returns A new object with only the specified keys
     */
    $pick<K extends keyof P>(keys?: Array<K>): Pick<P, K>;
  } & {};

export type HTMLAttributes<E> = JSX.HTMLAttributes<E>;
export type EventHandler<T extends HTMLElement, E extends Event> = JSX.EventHandler<T, E>;

export type InputHTMLAttributes<E extends HTMLElement> = Omit<JSX.InputHTMLAttributes<E>, 'onInput' | 'oninput'> & {
  onInput?: EventHandler<E, InputEvent>;
  oninput?: EventHandler<E, InputEvent>;
};
export type AppEntry = Component<{ url?: string }>;
