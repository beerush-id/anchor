import type { HTMLAttributes } from 'react';
import { classx } from '@anchorlib/headless-kit/utils';
import { named } from '@anchorlib/react';

export type SwitchLabelProps = HTMLAttributes<HTMLLabelElement>;

export const SwitchLabel = named<SwitchLabelProps>(({ children, className, ...props }) => {
  return (
    <label className={classx('ark-switch-label', className)} {...props}>
      {children}
    </label>
  );
}, 'SwitchLabel');
