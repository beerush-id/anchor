import { type HTMLAttributes, type ReactNode } from 'react';
import { createTab } from '@anchorlib/headless-kit/states';
import { type ClassList, type ClassName, classx } from '@anchorlib/headless-kit/utils';
import { TabContext } from './context.js';
import { setup } from '@anchorlib/react';

export type TabProps = HTMLAttributes<HTMLDivElement> & {
  value?: string;
  disabled?: boolean;
  children?: ReactNode;
  className?: ClassName | ClassList;
};

export const Tab = setup(({ className, children, value, disabled, ...props }: TabProps) => {
  const tab = createTab({ active: value, disabled });
  return (
    <TabContext value={tab} {...props}>
      <div className={classx('ark-tab', className)}>{children}</div>
    </TabContext>
  );
}, 'Tab');
