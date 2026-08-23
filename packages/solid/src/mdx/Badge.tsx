import { classx } from '@airlib/core';
import { type JSX, splitProps } from '../solid.js';

export type BadgeVariant = 'tip' | 'info' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps extends JSX.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  text?: string;
  children?: JSX.Element;
}

export function Badge(allProps: BadgeProps): JSX.Element {
  const [props, rest] = splitProps(allProps, ['variant', 'text', 'class', 'children']);

  return (
    <span {...rest} class={classx('air-mdx-badge', `air-mdx-badge-${props.variant ?? 'info'}`, props.class)}>
      {props.text ?? props.children}
    </span>
  );
}
