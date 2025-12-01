import type { MutableRef, StateChange } from '@anchorlib/core';
import type { ReactNode } from 'react';
import type { BindingRef } from './binding.js';

export type ViewRenderer<P> = (props: P) => ReactNode;

export type MountHandler = () => void | CleanupHandler;
export type CleanupHandler = () => void;
export type EffectHandler = (event: StateChange) => void | EffectCleanup;
export type EffectCleanup = () => void;

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

export interface Effect {
  /**
   * Registers an effect handler function that will be executed during the component's lifecycle.
   *
   * Effects are used for side effects that need to be cleaned up, such as subscriptions or timers.
   * They are executed after the component is mounted and will re-run when any state accessed within
   * the effect handler changes. Effects can optionally return a cleanup function which will be
   * executed before the effect runs again or when the component is unmounted.
   *
   * Note: Effects should typically not mutate state that they also observe, as this can lead to
   * circular updates and infinite loops.
   *
   * @param handler - The effect handler function to register
   * @throws {Error} If called outside a Setup component context
   */
  (handler: EffectHandler): void;

  /**
   * Registers multiple effect handlers that will be executed when the state changes.
   * Only the first handler that receives an event will run.
   *
   * @param handlers - An array of effect handler functions
   */
  any(handlers: EffectHandler[]): void;
}

export type BindableProps = {
  [key: string]: unknown;
};
export type Binding<T> = BindingRef<MutableRef<unknown> | Record<string, unknown>, T>;
