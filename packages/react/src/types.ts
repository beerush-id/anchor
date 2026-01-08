import type { FunctionComponent, HTMLAttributes, MemoExoticComponent, ReactNode } from 'react';

export type MountHandler = () => void | CleanupHandler;
export type CleanupHandler = () => void;

export type Lifecycle = {
  /**
   * Mounts the component by executing all registered mount handlers and effects.
   * Cancels any pending cleanup operations and schedules mount operations.
   * Mount handlers can return cleanup functions which will be stored for later execution.
   */
  mount(): void;

  /**
   * Cleans up the component by executing all registered cleanup handlers.
   * Cancels any pending mount operations and schedules cleanup operations.
   * After execution, clears all registered mount and cleanup handlers.
   */
  cleanup(): void;

  /**
   * Renders the component by executing the provided function within the component's context.
   * Temporarily sets the current lifecycle handlers to this component's handlers,
   * executes the render function, and then restores the previous handlers.
   *
   * @param fn - The render function to execute
   * @returns The result of the render function
   */
  render<R>(fn: () => R): R;
};

/**
 * Represents a binding reference for two-way data binding.
 *
 * @template T - The type of value being bound
 */
export type Bindable<T> = {
  get value(): T;
  set value(value: T);
};

/**
 * Represents a linking reference for one-way data binding.
 *
 * @template T - The type of value being linked
 */
export type Linked<T> = {
  get target(): T;
};

/**
 * Represents a function that returns a value.
 *
 * @template T - The type of value returned by the function
 */
export type ValueReader<T> = () => T;

export type ReactiveProp<T> = T | ValueReader<T> | Linked<T>;
export type BindableProp<T> = T | ValueReader<T> | Linked<T> | Bindable<T>;

/**
 * Represents a reactive props that can be bound to a component.
 * Allows any string key with unknown values.
 */
export type ReactiveProps<P> = {
  [K in keyof P]: P[K] extends Bindable<infer T> | undefined ? BindableProp<T> : ReactiveProp<P[K]>;
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
export type ComponentProps<P> = Omit<ReadonlyProps<P>, WritablePropKeys<P>> &
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

/**
 * Props type for view components that extends component props with additional functionality.
 * Provides both readonly and writable properties with $omit and $pick methods.
 *
 * @template P - The base props type
 */
export type ViewProps<P> = ComponentProps<P>;

/**
 * Generic setup props type that allows any string key with unknown values.
 * Used as a base type for components that need flexible prop handling.
 */
export type GenericProps = { [key: string]: unknown };

/**
 * A setup component function that takes ComponentProps and returns a ReactNode.
 *
 * @template P - The props type
 * @param props - The component props with additional $omit functionality
 * @returns A ReactNode representing the rendered component
 */
export type Component<P> = (props: ComponentProps<P>) => ReactNode;

/**
 * Represents a stable component that is either memoized or a regular function component.
 *
 * @template P - The props type
 */
export type StableComponent<P> =
  | MemoExoticComponent<FunctionComponent<ReactiveProps<P>>>
  | FunctionComponent<ReactiveProps<P>>;

/**
 * A functional component that accepts reactive props.
 *
 * @template P - The props type
 */
export type SnippetView<P> = FunctionComponent<ReactiveProps<P>>;

/**
 * A functional component that accepts reactive props for templates.
 *
 * @template P - The props type
 */
export type TemplateView<P> = FunctionComponent<ReactiveProps<P>>;

/**
 * A function that takes component props and parent props, returning a React node.
 * Used for creating snippets that can access both local and parent context.
 *
 * @template P - The component props type
 * @template SP - The parent props type (defaults to GenericProps)
 * @param props - The component's props
 * @param parentProps - The parent component's props
 * @returns A ReactNode representing the snippet
 */
export type Snippet<P, SP = GenericProps> = (props: P, parentProps: ViewProps<SP>) => ReactNode;

/**
 * A function that takes view props and returns a React node.
 * Used for creating templates that work with view-specific props.
 *
 * @template P - The props type
 * @param props - The view props
 * @returns A ReactNode representing the template
 */
export type Template<P> = (props: ViewProps<P>) => ReactNode;

/**
 * A function that takes view props and returns a React node.
 * Represents a view component that works with view-specific props.
 *
 * @template P - The props type
 * @param props - The view props
 * @returns A ReactNode representing the view
 */
export type View<P> = (props: ViewProps<P>) => ReactNode;

/**
 * A reference object that holds an HTML element and its attributes.
 * Provides reactive updates when attributes change.
 *
 * @template E - The HTMLElement type
 * @template P - The HTML attributes type
 */
export type NodeRef<E extends HTMLElement, P extends HTMLAttributes<E> = HTMLAttributes<E>> = {
  /** Get the current HTML element */
  get current(): E;
  /** Set the current HTML element and trigger attribute updates */
  set current(value: E);
  /** Get the current attributes */
  get attributes(): P;
  /** Destroy the observer and clean up resources */
  destroy(): void;
};
