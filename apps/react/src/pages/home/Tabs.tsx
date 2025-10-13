import { Tab, TabButton, TabContent, TabList } from '@anchorkit/react/components';

export function Tabs() {
  return (
    <div className="mb-8 flex flex-col gap-2">
      <h2 className="text-xl font-semibold mb-2">Tabs</h2>
      <Tab>
        <TabList>
          <TabButton name={'account'}>Account</TabButton>
          <TabButton name={'password'}>Password</TabButton>
          <TabButton name={'profile'}>Profile</TabButton>
        </TabList>
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
      <Tab value={'disabled-account'} disabled>
        <TabList>
          <TabButton name={'disabled-account'}>Account</TabButton>
          <TabButton name={'disabled-password'}>Password</TabButton>
          <TabButton name={'disabled-profile'}>Profile</TabButton>
        </TabList>
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
}
