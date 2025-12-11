import { getTab } from '@anchorkit/headless/states';
import { TabVisibility } from '@anchorkit/headless/states/tab.js';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { derived, nodeRef, render, setup } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type TabContentProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  className?: ClassName | ClassList;
};

export const TabContent = setup<TabContentProps>((props) => {
  const tab = getTab();
  const ref = nodeRef<HTMLDivElement>(() => ({
    className: classx('ark-tab-content', props.className, {
      'ark-active': tab?.visibility === TabVisibility.BLANK || tab?.active === props.name,
    }),
  }));

  const content = derived(() => {
    return (
      <div
        id={`${props.name}-panel-${tab?.id}`}
        role="tabpanel"
        aria-labelledby={`${props.name}-tab-${tab?.id}`}
        ref={ref}
        {...ref.attributes}
      >
        {props.children}
      </div>
    );
  });

  return render(() => {
    if (tab?.visibility === TabVisibility.BLANK && tab?.active !== props.name) return;
    return content.value;
  }, 'TabContent');
}, 'TabContent');
