import { AccordionGroupCtx, createAccordionGroup } from '@anchorkit/headless/states';
import { classx } from '@anchorkit/headless/utils';
import { contextProvider, effect, nodeRef, setup, snippet } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type AccordionGroupProps = HTMLAttributes<HTMLDivElement> & {
  disabled?: boolean;
  multiple?: boolean;
};

export const AccordionGroup = setup<AccordionGroupProps>((props) => {
  const group = createAccordionGroup();
  const Context = contextProvider(AccordionGroupCtx, 'AccordionGroup');

  effect(() => {
    group.disabled = props.disabled ?? false;
    group.multiple = props.multiple ?? false;
  });

  const groupRef = nodeRef<HTMLDivElement>(() => ({
    className: classx('ark-accordion-group', props.className),
  }));

  const Content = snippet(
    () => (
      <div ref={groupRef} {...groupRef.attributes}>
        {props.children}
      </div>
    ),
    'AccordionGroup'
  );

  return (
    <Context value={group}>
      <Content />
    </Context>
  );
}, 'AccordionGroup');
