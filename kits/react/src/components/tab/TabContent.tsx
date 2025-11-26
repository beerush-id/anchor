import { classAction } from '@anchorkit/headless/actions';
import { getTab } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { setup, view } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type TabContentProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  className?: ClassName | ClassList;
};

export const TabContent = setup(({ name, children, className, ...props }: TabContentProps) => {
  const tab = getTab();
  const ref = classAction<HTMLDivElement>(() =>
    classx('ark-tab-content', className, {
      'ark-active': tab?.active === name,
    })
  );

  const TabContentView = view(() => {
    if (tab?.visibility === 'blank' && tab?.active !== name) return;

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`${name}-panel-${tab?.id}`}
        aria-labelledby={`${name}-tab-${tab?.id}`}
        className={ref.className}
        {...props}
      >
        {children}
      </div>
    );
  }, 'TabContent');

  return <TabContentView />;
}, 'TabContent');
