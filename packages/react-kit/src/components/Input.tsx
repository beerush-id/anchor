import { type InputHTMLAttributes } from 'react';
import { bindable } from '@anchorlib/react/view';
import type { StylingProps } from '../types.js';
import { classx, stylex } from '@utils/classx.js';

export const Input = bindable<InputHTMLAttributes<HTMLInputElement> & StylingProps>(
  ({ className, style, ...props }) => (
    <input className={classx(classx.brand('input'), className)} style={stylex(style)} {...props} />
  ),
  'Input'
);
