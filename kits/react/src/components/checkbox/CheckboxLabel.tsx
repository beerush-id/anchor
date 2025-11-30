import type { HTMLAttributes } from 'react';
import { classx } from '@anchorkit/headless/utils';
import { named } from '@anchorlib/react-classic';

export type CheckboxLabelProps = HTMLAttributes<HTMLLabelElement>;

export const CheckboxLabel = named<CheckboxLabelProps>(({ children, className, ...props }) => {
  return (
    <label className={classx('ark-checkbox-label', className)} {...props}>
      {children}
    </label>
  );
}, 'CheckboxLabel');
