import type { HTMLAttributes } from 'react';
import { type ClassList, type ClassName, classx } from '@anchorlib/headless-kit/utils';
import { named } from '@anchorlib/react';

export type TabListProps = HTMLAttributes<HTMLDivElement> & {
  className?: ClassName | ClassList;
};

export const TabList = named<TabListProps>(({ children, className, ...props }) => {
  return (
    <div role="tablist" className={classx('ark-tab-list', className)} {...props}>
      {children}
    </div>
  );
}, 'TabList');
