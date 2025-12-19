import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { template } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type CheckboxLabelProps = HTMLAttributes<HTMLLabelElement> & {
  className?: ClassName | ClassList;
};

export const CheckboxLabel = template<CheckboxLabelProps>(({ children, className, ...props }) => {
  return (
    <label className={classx('ark-checkbox-label', className)} {...props}>
      {children}
    </label>
  );
}, 'CheckboxLabel');
