import { getCollapsible } from '@anchorkit/headless/states';
import { classx } from '@anchorkit/headless/utils';
import { setup, view } from '@anchorlib/react';
import type { HTMLAttributes, MouseEventHandler } from 'react';
import { ChevronDown } from '../../icons/index.js';
import type { ReactProps } from '../../types.js';

export type AccordionTriggerProps = ReactProps<HTMLAttributes<HTMLButtonElement>>;

export const AccordionTrigger = setup(({ children, className, onClick, ...props }: AccordionTriggerProps) => {
  const state = getCollapsible();

  const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    state?.toggle();
    onClick?.(e);
  };

  const AccordionTriggerView = view(() => {
    const classList = classx('ark-accordion-trigger', className, {
      'ark-open': state?.expanded,
    });

    return (
      <button
        type="button"
        aria-expanded={state?.expanded}
        aria-disabled={state?.disabled}
        onClick={handleClick}
        className={classList}
        {...props}
      >
        {children}
        <ChevronDown />
      </button>
    );
  }, 'AccordionTrigger');

  return <AccordionTriggerView />;
}, 'AccordionTrigger');
