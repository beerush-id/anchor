import { getTab } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { derived, render, setup } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';

export type TabButtonProps = HTMLAttributes<HTMLButtonElement> & {
  name: string;
  disabled?: boolean;
  className?: ClassName | ClassList;
};

export const TabButton = setup<TabButtonProps>((props) => {
  const tab = getTab();

  if (tab) {
    tab.insert(props.name);

    if (!tab.active) tab.select(tab.active);
  }

  const disabled = derived(() => props.disabled || tab?.disabled);
  const selected = derived(() => tab?.active === props.name);

  return render(() => {
    const { name, children, className } = props;
    const classList = classx('ark-tab-button', className, {
      'ark-active': selected.value,
    });

    return (
      <button
        role="tab"
        id={`${name}-tab-${tab?.id}`}
        aria-controls={`${name}-panel-${tab?.id}`}
        aria-selected={selected.value ? 'true' : 'false'}
        aria-disabled={disabled.value ? 'true' : 'false'}
        className={classList}
        disabled={disabled.value}
        onClick={() => tab?.select(name)}
        {...props.$omit(['name', 'children', 'className', 'disabled'])}
      >
        {children}
      </button>
    );
  }, 'TabButton');
}, 'TabButton');
