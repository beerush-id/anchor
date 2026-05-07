import { getContext, setContext } from '@anchorlib/core';
import { cookies } from '@anchorlib/react';

export type AppTheme = 'light' | 'dark';
export type AppSettings = {
  theme: AppTheme;
  toggleTheme(): void;
};

export const APP_SETTINGS_KEY = Symbol('app-settings');

export function createSettings(): AppSettings {
  const settings = cookies<AppSettings>('app-settings', {
    theme: 'light',
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light';
    },
  });

  setContext(APP_SETTINGS_KEY, settings);
  return settings;
}

export function getSettings() {
  return getContext<AppSettings>(APP_SETTINGS_KEY);
}
