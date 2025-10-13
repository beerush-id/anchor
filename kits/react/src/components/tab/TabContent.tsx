import { type HTMLAttributes } from 'react';
import { setup, view } from '@anchorlib/react';
import { type ClassList, type ClassName, classx } from '@anchorlib/headless-kit/utils';
import { useTab } from './context.js';
import { useClassName } from '../../actions/index.js';

export type TabContentProps = HTMLAttributes<HTMLDivElement> & {
  name: string;
  className?: ClassName | ClassList;
};

export const TabContent = setup(({ name, children, className, ...props }: TabContentProps) => {
  const tab = useTab();
  const ref = useClassName<HTMLDivElement>(() =>
    classx('ark-tab-content', className, {
      'ark-active': tab?.active === name,
    })
  );

  const TabContentView = view(() => {
    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`${name}-panel`}
        aria-labelledby={`${name}-tab`}
        className={ref.className}
        {...props}>
        {children}
      </div>
    );
  }, 'TabContent');

  return <TabContentView />;
}, 'TabContent');
