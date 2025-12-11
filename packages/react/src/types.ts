import type { MutableRef } from '@anchorlib/core';
import type { FunctionComponent, HTMLAttributes, MemoExoticComponent, ReactNode } from 'react';
import type { BindingRef } from './binding.js';

export type SetupProps = { [key: string]: unknown };
export type Snippet<P, SP = SetupProps> = (props: P, parentProps: SP) => ReactNode;
export type Template<P> = (props: P) => ReactNode;

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
 * Represents props that can be bound to a component.
 * Allows any string key with unknown values.
 */
export type BindableProps = {
  [key: string]: unknown;
};

/**
 * Represents a binding reference that can hold either a mutable ref or a record of unknown values.
 *
 * @template T - The type of value being bound
 */
export type Binding<T> = BindingRef<MutableRef<unknown> | Record<string, unknown>, T>;

/**
 * Extended component props that include an $omit method for omitting specific keys.
 *
 * @template P - The base props type
 * @property $omit - A method that returns a new object with specified keys omitted
 */
export type ComponentProps<P> = P & {
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
};

/**
 * A setup component function that takes ComponentProps and returns a ReactNode.
 *
 * @template P - The props type
 * @param props - The component props with additional $omit functionality
 * @returns A ReactNode representing the rendered component
 */
export type SetupComponent<P> = (props: ComponentProps<P>) => ReactNode;

/**
 * Represents a stable component that is either memoized or a regular function component.
 *
 * @template P - The props type
 */
export type StableComponent<P> = MemoExoticComponent<FunctionComponent<P>> | FunctionComponent<P>;

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
