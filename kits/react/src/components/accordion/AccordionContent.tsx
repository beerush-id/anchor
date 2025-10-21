import { setup, view } from '@anchorlib/react';
import { type HTMLAttributes } from 'react';
import { useAccordion } from './context.js';
import type { ReactProps } from '../../types.js';
import { classx } from '@anchorkit/headless/utils';
import { useHeight } from '../../actions/index.js';

export type AccordionContentProps = ReactProps<HTMLAttributes<HTMLDivElement>>;

export const AccordionContent = setup(({ children, className, ...props }: AccordionContentProps) => {
  const state = useAccordion();
  const actionRef = useHeight<HTMLDivElement>();

  const AccordionContentView = view(() => {
    const classList = classx('ark-accordion-content', className, {
      'ark-open': state?.open,
    });

    return (
      <div ref={actionRef} role="region" className={classList} {...props}>
        {children}
      </div>
    );
  }, 'AccordionContent');

  return <AccordionContentView />;
}, 'AccordionContent');
