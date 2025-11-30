import { classAction } from '@anchorkit/headless/actions';
import { type CollapsibleInit, getCollapsibleGroup, setCollapsible } from '@anchorkit/headless/states';
import { classx } from '@anchorkit/headless/utils';
import { type BindingParam, setup, useBinding } from '@anchorlib/react-classic';
import type { HTMLAttributes } from 'react';
import type { ReactProps } from '../../types.js';

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
  const group = getCollapsibleGroup();
  const state = setCollapsible({ open, group, disabled, onChange });
  const classRef = classAction<HTMLDivElement>(() =>
    classx('ark-accordion', className, {
      'ark-open': state?.expanded,
    })
  );

  if (group && !group.value && open) {
    group.value = state.id;
  }

  useBinding(state, 'open', bindOpen);
  useBinding(state, 'disabled', bindDisabled);

  return (
    <div ref={classRef} className={classRef.className} {...props}>
      {children}
    </div>
  );
}, 'Accordion');
