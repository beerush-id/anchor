import { AccordionCtx, createAccordion, getAccordionGroup } from '@anchorkit/headless/states';
import { classx } from '@anchorkit/headless/utils';
import { type Bindable, contextProvider, effect, nodeRef, onMount, setup, snippet } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type AccordionProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  expanded?: Bindable<boolean>;
  disabled?: boolean;
  onChange?: (expanded: boolean) => void;
};

export const Accordion = setup<AccordionProps>((props) => {
  const group = getAccordionGroup();
  const state = createAccordion({ name: props.name });
  const Context = contextProvider(AccordionCtx, 'Accordion');

  let mounted = false;

  effect(() => {
    state.name = props.name;
    state.checked = props.expanded ?? false;
    state.disabled = props.disabled ?? false;
  });

  effect(() => {
    props.expanded = state.checked;

    if (mounted) {
      props.onChange?.(state.checked);
    }
  });

  onMount(() => {
    mounted = true;
  });

  if (group) {
    group.insert(state);

    if (props.expanded) {
      if (group.multiple) {
        group.values.push(state.name);
      } else {
        group.value = state.name;
      }
    }
  }

  const divRef = nodeRef<HTMLDivElement>(() => ({
    className: classx('ark-accordion', props.className, {
      'ark-open': state?.checked,
    }),
  }));

  const Content = snippet(
    () => (
      <div ref={divRef} {...divRef.attributes}>
        {props.children}
      </div>
    ),
    'Accordion'
  );

  return (
    <Context value={state}>
      <Content />
    </Context>
  );
}, 'Accordion');
