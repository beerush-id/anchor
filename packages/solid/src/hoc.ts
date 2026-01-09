import type { Component, JSX } from 'solid-js';
import { proxyProps } from './props.js';
import type { BindableComponentProps, BindableProps } from './types.js';

export type BindableComponent<P> = (props: P) => JSX.Element;

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
