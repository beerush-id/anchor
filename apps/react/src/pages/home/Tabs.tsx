import {
  Switch,
  SwitchLabel,
  Tab,
  TabButton,
  TabContent,
  TabList,
  TabVisibility,
  TextInput,
} from '@anchorkit/react/components';
import { $bind, $use, mutable, render, setup } from '@anchorlib/react';

const AdminForm = setup<{ isAdmin: boolean }>((props) => {
  const username = mutable('');

  return render(() => {
    if (!props.isAdmin) return <span>Access denied.</span>;
    return <TextInput value={$bind(username)} placeholder="Username" />;
  });
});

export const Tabs = setup(() => {
  const tabs = mutable({
    tab1: {
      active: 'profile',
      disabled: false,
    },
    tab2: {
      active: 'disabled-account',
      disabled: true,
    },
  });
  const admin = mutable(false);

  return (
    <div className="mb-8 flex flex-col gap-2">
      <div className="flex items-center mb-2 gap-4">
        <h2 className="text-xl font-semibold flex-1">Tabs</h2>
      </div>
      <Tab value={$bind(tabs.tab1, 'active')} disabled={$use(tabs.tab1, 'disabled')}>
        <div className="flex items-center w-full">
          <TabList>
            <TabButton name={'profile'}>Profile</TabButton>
            <TabButton name={'account'}>Account</TabButton>
            <TabButton name={'password'}>Password</TabButton>
            <TabButton name={'setting'}>Settings</TabButton>
          </TabList>
          <div className="flex-1"></div>
          <SwitchLabel className={$use(() => (tabs.tab1.disabled ? 'text-primary' : ''))}>
            <span>Disable</span>
            <Switch checked={$bind(tabs.tab1, 'disabled')} />
          </SwitchLabel>
          <SwitchLabel className={'ml-4'}>
            <span>Make Admin</span>
            <Switch checked={$bind(admin)} />
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
        <TabContent name={'setting'} className={'p-6'}>
          <AdminForm isAdmin={$use(admin)} />
        </TabContent>
      </Tab>
      <Tab value={$bind(tabs.tab2, 'active')} disabled={$use(tabs.tab2, 'disabled')} visibility={TabVisibility.BLANK}>
        <div className="flex items-center w-full">
          <TabList>
            <TabButton name={'disabled-account'}>Account</TabButton>
            <TabButton name={'disabled-password'}>Password</TabButton>
            <TabButton name={'disabled-profile'} disabled>
              Profile
            </TabButton>
            <TabButton name={'disabled-setting'}>Settings</TabButton>
          </TabList>
          <div className="flex-1"></div>
          <SwitchLabel>
            <span>Disable</span>
            <Switch checked={$bind(tabs.tab2, 'disabled')} />
          </SwitchLabel>
          <SwitchLabel className={'ml-4'}>
            <span>Make Admin</span>
            <Switch checked={$bind(admin)} />
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
        <TabContent name={'disabled-setting'} className={'p-6'}>
          <AdminForm isAdmin={$use(admin)} />
        </TabContent>
      </Tab>
    </div>
  );
});
