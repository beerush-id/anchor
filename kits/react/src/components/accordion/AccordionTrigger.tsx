import { setup, view } from '@anchorlib/react';
import { type HTMLAttributes, type MouseEventHandler } from 'react';
import { useAccordion } from './context.js';
import type { ReactProps } from '../../types.js';
import { classx } from '@anchorkit/headless/utils';
import { ChevronDown } from '../../icons/index.js';

export type AccordionTriggerProps = ReactProps<HTMLAttributes<HTMLButtonElement>>;

export const AccordionTrigger = setup(({ children, className, onClick, ...props }: AccordionTriggerProps) => {
  const state = useAccordion();

  const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    state?.toggle();
    onClick?.(e);
  };

  const AccordionTriggerView = view(() => {
    const classList = classx('ark-accordion-trigger', className, {
      'ark-open': state?.open,
    });

    return (
      <button
        type="button"
        aria-expanded={state?.open}
        aria-disabled={state?.disabled}
        onClick={handleClick}
        className={classList}
        {...props}>
        {children}
        <ChevronDown />
      </button>
    );
  }, 'AccordionTrigger');

  return <AccordionTriggerView />;
}, 'AccordionTrigger');
