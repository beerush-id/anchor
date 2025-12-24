import { createTab, TabCtx, TabVisibility } from '@anchorkit/headless/states';
import { type ClassList, type ClassName, classx } from '@anchorkit/headless/utils';
import { type Bindable, contextProvider, effect, nodeRef, setup, snippet } from '@anchorlib/react';
import type { HTMLAttributes, ReactNode } from 'react';

export { TabVisibility } from '@anchorkit/headless/states';

export type TabProps = HTMLAttributes<HTMLDivElement> & {
  value?: Bindable<string>;
  disabled?: boolean;
  children?: ReactNode;
  className?: ClassName | ClassList;
  visibility?: TabVisibility;
};

const Provider = contextProvider(TabCtx, 'Tab');

export const Tab = setup<TabProps>((props) => {
  const tab = createTab();
  const ref = nodeRef<HTMLDivElement>(() => ({
    className: classx('ark-tab', props.className),
  }));

  // Sync tab state from props.
  effect(() => (tab.active = props.value ?? ''));
  effect(() => (tab.disabled = props.disabled ?? false));
  effect(() => (tab.visibility = props.visibility ?? TabVisibility.HIDDEN));

  // Sync props from tab state.
  effect(() => (props.value = tab.active));

  const Template = snippet(
    () => (
      <div ref={ref} {...ref.attributes}>
        {props.children}
      </div>
    ),
    'Tab'
  );

  return (
    <Provider value={tab}>
      <Template />
    </Provider>
  );
}, 'Tab');
