import { type HTMLAttributes } from 'react';
import { setup, view } from '@anchorlib/react';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { getTab } from '@anchorkit/headless/states';

export type TabButtonProps = HTMLAttributes<HTMLButtonElement> & {
  name: string;
  disabled?: boolean;
  className?: ClassName | ClassList;
};

export const TabButton = setup(({ name, children, className, disabled, ...props }: TabButtonProps) => {
  const tab = getTab();

  if (tab && !tab.active) tab.select(name);

  const Template = view(() => {
    const classList = classx('ark-tab-button', className, {
      'ark-active': tab?.active === name,
    });

    return (
      <button
        role="tab"
        id={`${name}-tab-${tab?.id}`}
        aria-controls={`${name}-panel-${tab?.id}`}
        aria-selected={tab?.active === name}
        className={classList}
        disabled={disabled ?? tab?.disabled}
        onClick={() => tab?.select(name)}
        {...props}>
        {children}
      </button>
    );
  }, 'TabButton');

  return <Template />;
}, 'TabButton');
