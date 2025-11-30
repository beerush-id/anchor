import { type CollapsibleGroupInit, setCollapsibleGroup } from '@anchorkit/headless/states';
import { classx } from '@anchorkit/headless/utils';
import { setup } from '@anchorlib/react-classic';
import type { HTMLAttributes } from 'react';
import type { ReactProps } from '../../types.js';

export type AccordionGroupProps = ReactProps<HTMLAttributes<HTMLDivElement> & CollapsibleGroupInit>;

export const AccordionGroup = setup(({ multiple, disabled, className, children, ...props }: AccordionGroupProps) => {
  setCollapsibleGroup({ multiple, disabled });

  return (
    <div className={classx('ark-accordion-group', className)} {...props}>
      {children}
    </div>
  );
}, 'AccordionGroup');
