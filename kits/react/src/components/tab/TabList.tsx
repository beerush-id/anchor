import { keyNavRef, NavDirection } from '@anchorkit/headless/actions';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { onCleanup, setup } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type TabListProps = HTMLAttributes<HTMLDivElement> & {
  className?: ClassName | ClassList;
  direction?: NavDirection;
  buttonSelector?: string;
};

export const TabList = setup(({ children, className, buttonSelector, ...props }: TabListProps) => {
  const ref = keyNavRef<HTMLDivElement>({ direction: NavDirection.HORIZONTAL, buttonSelector });

  onCleanup(() => {
    ref.destroy();
  });

  return (
    <div ref={ref} role="tablist" className={classx('ark-tab-list', className)} {...props}>
      {children}
    </div>
  );
}, 'TabList');
