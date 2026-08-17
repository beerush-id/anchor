import type { HTMLAttributes, ReactNode } from 'react';
import { classx, template } from '../index.js';

export type BadgeVariant = 'tip' | 'info' | 'warning' | 'danger' | 'neutral';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  text?: string;
  children?: ReactNode;
}

export const Badge = template<BadgeProps>(
  ({ variant = 'info', text, className, children, ...restProps }) => (
    <span {...restProps} className={classx('air-mdx-badge', `air-mdx-badge-${variant}`, className)}>
      {text ?? children}
    </span>
  ),
  'Badge'
);
