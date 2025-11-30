import { getTab } from '@anchorkit/headless/states';
import { TabVisibility } from '@anchorkit/headless/states/tab.js';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { propsRef, setup, template } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type TabContentProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  className?: ClassName | ClassList;
};

export const TabContent = setup((props: TabContentProps) => {
  const tab = getTab();
  const ref = propsRef<HTMLDivElement>(() => ({
    id: `${props.name}-panel-${tab?.id}`,
    className: classx('ark-tab-content', props.className, {
      'ark-active': tab?.active === props.name,
    }),
    'aria-labelledby': `${props.name}-tab-${tab?.id}`,
  }));

  const Template = template(() => {
    if (tab?.visibility === TabVisibility.BLANK && tab?.active !== props.name) return;

    return (
      <div role="tabpanel" ref={ref} {...ref.props}>
        {props.children}
      </div>
    );
  }, 'TabContent');

  return <Template />;
}, 'TabContent');
