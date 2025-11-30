import { Card, CardContent, CardHeader, CodeBlock } from '@anchorlib/react-kit/components';
import { debugRender } from '@anchorlib/react-classic';
import { useRef, useState } from 'react';

export function ReactImmutable() {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref);

  const [user, setUser] = useState({
    email: 'john@example.com',
    username: 'johndoe',
    verified: true,
    profile: {
      firstName: 'John',
      lastName: 'Doe',
      gender: 'male',
      age: 25,
    },
    settings: {
      preference: {
        theme: 'light',
      },
      notification: true,
    },
  });

  const handleProfileChange = (field: keyof typeof user.profile, value: string) => {
    setUser((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [field]: value,
      },
    }));
  };

  const handleThemeChange = (theme: string) => {
    setUser((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        preference: {
          ...prev.settings.preference,
          theme,
        },
      },
    }));
  };

  const handleNotificationChange = (notification: boolean) => {
    setUser((prev) => ({
      ...prev,
      settings: {
        ...prev.settings,
        notification,
      },
    }));
  };

  return (
    <Card ref={ref}>
      <CardHeader>
        <h1 className={'flex items-center gap-2'}>
          <img src="/images/logos/react.svg" alt="React Logo" height={24} width={24} />
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                value={user.profile.firstName}
                onChange={(e) => handleProfileChange('firstName', e.target.value)}
                className="ark-input w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                value={user.profile.lastName}
                onChange={(e) => handleProfileChange('lastName', e.target.value)}
                className="ark-input w-full"
              />
            </div>
          </div>
        </div>
        <h2 className="mb-3">Settings</h2>
        <div className="space-y-4">
          <div className={'flex items-center gap-3'}>
            <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={user.settings.preference.theme === 'light'}
                  onChange={() => handleThemeChange('light')}
                  className="text-blue-600"
                />
                <span className="ml-2">Light</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  checked={user.settings.preference.theme === 'dark'}
                  onChange={() => handleThemeChange('dark')}
                  className="text-blue-600"
                />
                <span className="ml-2">Dark</span>
              </label>
            </div>
          </div>
          <div className={'flex items-center gap-3'}>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={user.settings.notification}
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
        </div>
      </CardContent>
      <CodeBlock code={JSON.stringify(user, null, 2)} lang={'json'} />
    </Card>
  );
}
