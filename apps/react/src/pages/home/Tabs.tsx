import { Switch, SwitchLabel, Tab, TabButton, TabContent, TabList, TabVisibility } from '@anchorkit/react/components';
import { observer, useAnchor, view } from '@anchorlib/react';

export const Tabs = observer(() => {
  const [tabs] = useAnchor({
    tab1: {
      active: 'account',
      disabled: false,
    },
    tab2: {
      active: 'disabled-account',
      disabled: true,
    },
  });

  const ActiveTabs = view(() => (
    <div className={'flex items-center gap-2'}>
      <span>Tab 1: {tabs.tab1.active}</span>
      <span>Tab 2: {tabs.tab2.active}</span>
    </div>
  ));

  return (
    <div className="mb-8 flex flex-col gap-2">
      <div className="flex items-center mb-2 gap-4">
        <h2 className="text-xl font-semibold flex-1">Tabs</h2>
        <ActiveTabs />
      </div>
      <Tab bindValue={[tabs.tab1, 'active']} bindDisabled={[tabs.tab1, 'disabled']}>
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
      <Tab bindValue={[tabs.tab2, 'active']} visibility={TabVisibility.BLANK} bindDisabled={[tabs.tab2, 'disabled']}>
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
