import { getTab } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { render, setup } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type TabButtonProps = HTMLAttributes<HTMLButtonElement> & {
  name: string;
  disabled?: boolean;
  className?: ClassName | ClassList;
};

export const TabButton = setup((props: TabButtonProps) => {
  const tab = getTab();

  if (tab && !tab.active) tab.select(props.name);

  return render(() => {
    const { name, children, className, disabled, ...restProps } = props;

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
        {...restProps}
      >
        {children}
      </button>
    );
  }, 'TabButton');
}, 'TabButton');
