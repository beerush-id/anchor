import type { HTMLAttributes } from 'react';
import { classx } from '@anchorlib/headless-kit/utils';
import { named } from '@anchorlib/react';

export type CheckboxLabelProps = HTMLAttributes<HTMLLabelElement>;

export const CheckboxLabel = named<CheckboxLabelProps>(({ children, className, ...props }) => {
  return (
    <label className={classx('ark-checkbox-label', className)} {...props}>
      {children}
    </label>
  );
}, 'CheckboxLabel');
