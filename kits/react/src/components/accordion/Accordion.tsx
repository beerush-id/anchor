import { type BindingParam, setup, useBinding } from '@anchorlib/react';
import { type CollapsibleInit, createCollapsible } from '@anchorkit/headless/states';
import { AccordionContext, useAccordionGroup } from './context.js';
import type { ReactProps } from '../../types.js';
import { type HTMLAttributes } from 'react';
import { classx } from '@anchorkit/headless/utils';
import { useClassName } from '../../actions/index.js';

export type AccordionProps<O, D> = ReactProps<HTMLAttributes<HTMLDivElement> & CollapsibleInit> & {
  onChange?(open: boolean): void;
  bindOpen?: BindingParam<boolean, O>;
  bindDisabled?: BindingParam<boolean, D>;
};

export const Accordion = setup(function Accordion<O, D>({
  open,
  bindOpen,
  disabled,
  bindDisabled,
  onChange,
  children,
  className,
  ...props
}: AccordionProps<O, D>) {
  const group = useAccordionGroup();
  const state = createCollapsible({ open, group, disabled, onChange });
  const clsRef = useClassName<HTMLDivElement>(() =>
    classx('ark-accordion', className, {
      'ark-open': state?.open,
    })
  );

  useBinding(state, 'open', bindOpen);
  useBinding(state, 'disabled', bindDisabled);

  group?.items.add(state);

  return (
    <AccordionContext value={state}>
      <div ref={clsRef} className={clsRef.className} {...props}>
        {children}
      </div>
    </AccordionContext>
  );
}, 'Accordion');
