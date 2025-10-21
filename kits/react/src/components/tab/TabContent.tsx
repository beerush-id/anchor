import { type HTMLAttributes } from 'react';
import { setup, view } from '@anchorlib/react';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { useClassName } from '../../actions/index.js';
import { getTab } from '@anchorkit/headless/states';

export type TabContentProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  className?: ClassName | ClassList;
};

export const TabContent = setup(({ name, children, className, ...props }: TabContentProps) => {
  const tab = getTab();
  const ref = useClassName<HTMLDivElement>(() =>
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
        {...props}>
        {children}
      </div>
    );
  }, 'TabContent');

  return <TabContentView />;
}, 'TabContent');
