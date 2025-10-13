import { type HTMLAttributes } from 'react';
import { setup, view } from '@anchorlib/react';
import { type ClassList, type ClassName, classx } from '@anchorlib/headless-kit/utils';
import { useTab } from './context.js';

export type TabButtonProps = HTMLAttributes<HTMLButtonElement> & {
  name: string;
  disabled?: boolean;
  className?: ClassName | ClassList;
};

export const TabButton = setup(({ name, children, className, disabled, ...props }: TabButtonProps) => {
  const tab = useTab();

  if (tab && !tab.active) tab.select(name);

  const TabButtonView = view(() => {
    const classList = classx('ark-tab-button', className, {
      'ark-active': tab?.active === name,
    });

    return (
      <button
        role="tab"
        id={`${name}-tab`}
        aria-controls={`${name}-panel`}
        aria-selected={tab?.active === name}
        className={classList}
        disabled={disabled ?? tab?.disabled}
        onClick={() => tab?.select(name)}
        {...props}>
        {children}
      </button>
    );
  }, 'TabButton');

  return <TabButtonView />;
}, 'TabButton');
