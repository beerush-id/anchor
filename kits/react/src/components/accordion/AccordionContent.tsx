import { heightAction } from '@anchorkit/headless/actions';
import { getCollapsible } from '@anchorkit/headless/states';
import { classx } from '@anchorkit/headless/utils';
import { setup, view } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';
import type { ReactProps } from '../../types.js';

export type AccordionContentProps = ReactProps<HTMLAttributes<HTMLDivElement>>;

export const AccordionContent = setup(({ children, className, ...props }: AccordionContentProps) => {
  const state = getCollapsible();
  const heightRef = heightAction<HTMLDivElement>();

  const AccordionContentView = view(() => {
    const classList = classx('ark-accordion-content', className, {
      'ark-open': state?.expanded,
    });

    return (
      <div ref={heightRef} role="presentation" className={classList} {...props}>
        {children}
      </div>
    );
  }, 'AccordionContent');

  return <AccordionContentView />;
}, 'AccordionContent');
