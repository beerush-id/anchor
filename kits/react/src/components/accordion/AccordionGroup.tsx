import { setup } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';
import { type CollapsibleGroupInit } from '@anchorkit/headless/states';
import { classx } from '@anchorkit/headless/utils';
import { AccordionGroupContext, useAccordionGroupState } from './context.js';
import type { ReactProps } from '../../types.js';

export type AccordionGroupProps = ReactProps<HTMLAttributes<HTMLDivElement> & CollapsibleGroupInit>;

export const AccordionGroup = setup(({ multiple, disabled, className, children, ...props }: AccordionGroupProps) => {
  const state = useAccordionGroupState({ multiple, disabled });

  return (
    <AccordionGroupContext value={state}>
      <div className={classx('ark-accordion-group', className)} {...props}>
        {children}
      </div>
    </AccordionGroupContext>
  );
}, 'AccordionGroup');
