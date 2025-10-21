import { type HTMLAttributes, type ReactNode } from 'react';
import { setTab, type TabVisibility } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { type BindingParam, effect, setup, useBinding } from '@anchorlib/react';

export { TabVisibility } from '@anchorkit/headless/states';

export type TabProps<V, D> = HTMLAttributes<HTMLDivElement> & {
  value?: string;
  bindValue?: BindingParam<string, V>;
  disabled?: boolean;
  bindDisabled?: BindingParam<boolean, D>;
  children?: ReactNode;
  className?: ClassName | ClassList;
  visibility?: TabVisibility;
};

export const Tab = setup(function Tab<V, D>({
  value,
  children,
  disabled,
  className,
  bindValue,
  visibility,
  bindDisabled,
  ...props
}: TabProps<V, D>) {
  const tab = setTab({ active: value, disabled, visibility });

  useBinding(tab, 'active', bindValue);
  useBinding(tab, 'disabled', bindDisabled);

  effect(() => {
    if (tab.active === 'password') {
      tab.active = 'profile';
    }
  });

  return (
    <div className={classx('ark-tab', className)} {...props}>
      {children}
    </div>
  );
}, 'Tab');
