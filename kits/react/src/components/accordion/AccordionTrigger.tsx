import { getAccordion } from '@anchorkit/headless/states';
import { classx } from '@anchorkit/headless/utils';
import { render, setup } from '@anchorlib/react';
import type { ButtonHTMLAttributes, MouseEventHandler } from 'react';
import { ChevronDown } from '../../icons/index.js';

export type AccordionTriggerProps = ButtonHTMLAttributes<HTMLButtonElement>;

export const AccordionTrigger = setup<AccordionTriggerProps>((props) => {
  const state = getAccordion();

  const handleClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    state?.toggle();
    props?.onClick?.(e);
  };

  return render(() => {
    const classList = classx('ark-accordion-trigger', props.className, {
      'ark-open': state?.expanded,
    });

    return (
      <button
        type="button"
        aria-expanded={state?.expanded}
        aria-disabled={state?.disabled}
        onClick={handleClick}
        className={classList}
      >
        {props.children}
        <ChevronDown />
      </button>
    );
  }, 'AccordionTrigger');
}, 'AccordionTrigger');
