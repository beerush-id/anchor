import type { HTMLAttributes } from 'react';
import { classx } from '@anchorkit/headless/utils';
import { named } from '@anchorlib/react-classic';

export type SwitchLabelProps = HTMLAttributes<HTMLLabelElement>;

export const SwitchLabel = named<SwitchLabelProps>(({ children, className, ...props }) => {
  return (
    <label className={classx('ark-switch-label', className)} {...props}>
      {children}
    </label>
  );
}, 'SwitchLabel');
