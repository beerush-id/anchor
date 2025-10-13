import { Card, CardContent, CardHeader, CodeBlock } from '@anchorlib/react-kit/components';
import { type WritableKeys } from '@anchorlib/core';
import { debugRender, useImmutable, useWriter, view } from '@anchorlib/react';
import { useRef } from 'react';

export function AnchorImmutable() {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref);

  const [user] = useImmutable({
    email: 'john@example.com',
    username: 'johndoe',
    verified: true,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      age: 30,
    },
    settings: {
      preference: {
        theme: 'light',
      },
      notification: true,
    },
  });

  const profile = useWriter(user.profile, ['firstName', 'lastName']);
  const settings = useWriter(user.settings, ['notification']);
  const preference = useWriter(user.settings.preference);

  const handleProfileChange = (field: WritableKeys<typeof profile>, value: string) => {
    profile[field] = value;
  };

  const handleThemeChange = (theme: string) => {
    preference.theme = theme;
  };

  const handleNotificationChange = (notification: boolean) => {
    settings.notification = notification;
  };

  const ProfileForm = view(() => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
        <input
          type="text"
          value={profile.firstName}
          onChange={(e) => handleProfileChange('firstName', e.target.value)}
          className="ark-input w-full"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
        <input
          type="text"
          value={profile.lastName}
          onChange={(e) => handleProfileChange('lastName', e.target.value)}
          className="ark-input w-full"
        />
      </div>
    </div>
  ));

  const ThemeSetting = view(() => (
    <div className={'flex items-center gap-3'}>
      <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
      <div className="flex space-x-4">
        <label className="inline-flex items-center">
          <input
            type="radio"
            checked={preference.theme === 'light'}
            onChange={() => handleThemeChange('light')}
            className="text-blue-600"
          />
          <span className="ml-2">Light</span>
        </label>
        <label className="inline-flex items-center">
          <input
            type="radio"
            checked={preference.theme === 'dark'}
            onChange={() => handleThemeChange('dark')}
            className="text-blue-600"
          />
          <span className="ml-2">Dark</span>
        </label>
      </div>
    </div>
  ));

  const NotificationSetting = view(() => (
    <div className={'flex items-center gap-3'}>
      <label className="inline-flex items-center">
        <input
          type="checkbox"
          checked={settings.notification}
          onChange={(e) => handleNotificationChange(e.target.checked)}
          className="rounded text-blue-600"
        />
        <span className="ml-2">Enable notifications</span>
      </label>
      <label className="inline-flex items-center">
        <input
          type="checkbox"
          checked={user.verified}
          disabled
          onChange={(e) => handleNotificationChange(e.target.checked)}
          className="rounded text-blue-600"
        />
        <span className="ml-2">Verified</span>
      </label>
    </div>
  ));

  const JsonOutput = view(() => <CodeBlock code={JSON.stringify(user, null, 2)} lang={'json'} />);

  return (
    <Card ref={ref}>
      <CardHeader>
        <h1 className={'flex items-center gap-2'}>
          <img src="/anchor-logo.svg" alt="React Logo" height={24} width={24} />
          <span>Edit Profile</span>
        </h1>
      </CardHeader>
      <CardContent className={'p-4'}>
        <div className="flex flex-col gap-3 mb-6">
          <h2>Account Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-600">Email</label>
              <div className="ark-input opacity-50">{user.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600">Username</label>
              <div className="ark-input opacity-50">{user.username}</div>
            </div>
          </div>
          <ProfileForm />
        </div>
        <h2 className="mb-3">Settings</h2>
        <div className="space-y-4">
          <ThemeSetting />
          <NotificationSetting />
        </div>
      </CardContent>
      <JsonOutput />
    </Card>
  );
}
