import { setTab, TabVisibility } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { effect, propsRef, setup, template } from '@anchorlib/react';
import type { HTMLAttributes, ReactNode } from 'react';

export { TabVisibility } from '@anchorkit/headless/states';

export type TabProps = HTMLAttributes<HTMLDivElement> & {
  value?: string;
  disabled?: boolean;
  children?: ReactNode;
  className?: ClassName | ClassList;
  visibility?: TabVisibility;
};

export const Tab = setup(function Tab(props: TabProps) {
  const tab = setTab();
  const tabProps = propsRef<HTMLDivElement>(() => ({
    className: classx('ark-tab', props.className),
  }));

  effect.any([
    () => {
      tab.active = props.value ?? '';
    },
    () => {
      tab.disabled = props.disabled ?? false;
    },
    () => {
      tab.visibility = props.visibility ?? TabVisibility.HIDDEN;
    },
    () => {
      props.value = tab.active;
    },
  ]);

  const Template = template(
    () => (
      <div ref={tabProps} {...tabProps.props}>
        {props.children}
      </div>
    ),
    'Tab'
  );

  return <Template />;
}, 'Tab');
