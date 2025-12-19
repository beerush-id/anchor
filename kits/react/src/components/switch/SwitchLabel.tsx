import { classx } from '@anchorkit/headless/utils';
import { template } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type SwitchLabelProps = HTMLAttributes<HTMLLabelElement>;

export const SwitchLabel = template<SwitchLabelProps>(
  ({ children, className, ...props }) => (
    <label className={classx('ark-switch-label', className)} {...props}>
      {children}
    </label>
  ),
  'SwitchLabel'
);
