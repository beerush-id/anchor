import type { Component, ComponentProps, JSX } from 'solid-js';
import { type BindableInternalProps, type BindableProps, proxyProps } from './props.js';

export type BindableComponent<P> = (props: P) => JSX.Element;

// biome-ignore lint/suspicious/noExplicitAny: library
export function bindable<P extends Record<string, any>>(
  Component: Component<BindableInternalProps<P>>,
  displayName?: string
): BindableComponent<BindableProps<P>> {
  // biome-ignore lint/suspicious/noExplicitAny: library
  const Bindable = (props: ComponentProps<any>) => {
    const bindableProps = proxyProps(props);
    return Component(bindableProps);
  };
  Bindable.displayName = `Bindable(${displayName || Component.name || 'Anonymous'})`;

  return Bindable as BindableComponent<BindableProps<P>>;
}
