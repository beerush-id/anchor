import { type ButtonHTMLAttributes } from 'react';
import { optimized } from '@view/Optimized.js';
import { classx } from '@utils/classx.js';

export const Button = optimized<ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }) => {
    return <button {...props}>{children}</button>;
  },
  'Button',
  classx.brand('button')
);

export const IconButton = optimized<ButtonHTMLAttributes<HTMLButtonElement>>(
  ({ children, ...props }) => {
    return <button {...props}>{children}</button>;
  },
  'IconButton',
  classx.brand('icon-button')
);
