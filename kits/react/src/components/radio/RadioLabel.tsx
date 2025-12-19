import { classx } from '@anchorkit/headless/utils';
import { template } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type RadioLabelProps = HTMLAttributes<HTMLLabelElement>;

export const RadioLabel = template<RadioLabelProps>(
  ({ children, className, ...props }) => (
    <label className={classx('ark-radio-label', className)} {...props}>
      {children}
    </label>
  ),
  'RadioLabel'
);
