import type { HTMLAttributes } from 'react';
import { classx } from '@anchorkit/headless/utils';
import { named } from '@anchorlib/react-classic';

export type RadioLabelProps = HTMLAttributes<HTMLLabelElement>;

export const RadioLabel = named<RadioLabelProps>(({ children, className, ...props }) => {
  return (
    <label className={classx('ark-radio-label', className)} {...props}>
      {children}
    </label>
  );
}, 'RadioLabel');
