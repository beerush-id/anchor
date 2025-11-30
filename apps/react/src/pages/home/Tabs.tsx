import { Switch, SwitchLabel, Tab, TabButton, TabContent, TabList, TabVisibility } from '@anchorkit/react/components';
import { bind, effect, mutable, setup, view } from '@anchorlib/react';
import type { FC } from 'react';

const ActiveTab: FC<{
  name: string;
  tab: Record<string, string | boolean>;
  active?: string;
}> = setup((props) => {
  const { name, tab } = props;
  const renderCount = mutable(0);
  renderCount.value++;

  effect(() => {
    console.log('Active tab:', tab.active, renderCount.value);
  });

  const Template = view(
    () => (
      <span className={props.active === 'account' ? 'bg-red-200' : 'bg-blue-200'}>
        {name}: {tab.active}
      </span>
    ),
    'ActiveTab'
  );

  return <Template />;
}, 'ActiveTab');

export const Tabs = setup(() => {
  const tabs = mutable({
    tab1: {
      active: 'account',
      disabled: false,
    },
    tab2: {
      active: 'disabled-account',
      disabled: true,
    },
  });

  console.log('Tab list rendered.');

  const ActiveTabs = view(() => {
    console.log('Active tabs rendered.');

    return (
      <div className={'flex items-center gap-2'}>
        <ActiveTab name={'Tab 1'} tab={tabs.tab1} active={tabs.tab1.active} />
        <ActiveTab name={'Tab 2'} tab={tabs.tab2} active={tabs.tab2.active} />
      </div>
    );
  });

  return (
    <div className="mb-8 flex flex-col gap-2">
      <div className="flex items-center mb-2 gap-4">
        <h2 className="text-xl font-semibold flex-1">Tabs</h2>
        <ActiveTabs />
      </div>
      <Tab value={bind(tabs.tab1, 'active')} disabled={bind(tabs.tab1, 'disabled')}>
        <div className="flex items-center w-full">
          <TabList>
            <TabButton name={'account'}>Account</TabButton>
            <TabButton name={'password'}>Password</TabButton>
            <TabButton name={'profile'}>Profile</TabButton>
          </TabList>
          <div className="flex-1"></div>
          <SwitchLabel>
            <span>Disable</span>
            <Switch bindChecked={[tabs.tab1, 'disabled']} />
          </SwitchLabel>
        </div>
        <TabContent name={'account'} className={'p-6'}>
          <p>Content for Account</p>
        </TabContent>
        <TabContent name={'password'} className={'p-6'}>
          <p>Content for Password</p>
        </TabContent>
        <TabContent name={'profile'} className={'p-6'}>
          <p>Content for Profile</p>
        </TabContent>
      </Tab>
      <Tab value={bind(tabs.tab2, 'active')} disabled={bind(tabs.tab2, 'disabled')} visibility={TabVisibility.BLANK}>
        <div className="flex items-center w-full">
          <TabList>
            <TabButton name={'disabled-account'}>Account</TabButton>
            <TabButton name={'disabled-password'}>Password</TabButton>
            <TabButton name={'disabled-profile'} disabled>
              Profile
            </TabButton>
          </TabList>
          <div className="flex-1"></div>
          <SwitchLabel>
            <span>Disable</span>
            <Switch bindChecked={[tabs.tab2, 'disabled']} />
          </SwitchLabel>
        </div>
        <TabContent name={'disabled-account'} className={'p-6'}>
          <p>Content for Account</p>
        </TabContent>
        <TabContent name={'disabled-password'} className={'p-6'}>
          <p>Content for Password</p>
        </TabContent>
        <TabContent name={'disabled-profile'} className={'p-6'}>
          <p>Content for Profile</p>
        </TabContent>
      </Tab>
    </div>
  );
});
