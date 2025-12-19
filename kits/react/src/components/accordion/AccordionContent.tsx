import { getAccordion } from '@anchorkit/headless/states';
import { classx } from '@anchorkit/headless/utils';
import { nodeRef, render, setup } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type AccordionContentProps = HTMLAttributes<HTMLDivElement> & {
  height?: number;
};

export const AccordionContent = setup<AccordionContentProps>((props) => {
  const state = getAccordion();

  const contentRef = nodeRef<HTMLDivElement>((element) => {
    if (element instanceof HTMLElement) {
      element.style.setProperty('--ark-content-height', `${props.height ?? element.scrollHeight}px`);
    }

    return {
      className: classx('ark-accordion-content', props.className, {
        'ark-open': state?.expanded,
      }),
    };
  });

  return render(() => {
    return (
      <div role="presentation" ref={contentRef} {...contentRef.attributes}>
        {props.children}
      </div>
    );
  }, 'AccordionContent');
}, 'AccordionContent');
