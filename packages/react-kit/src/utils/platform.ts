import { persistent } from '@anchorlib/storage';

export function isMobile() {
  return isBrowser() && window.innerWidth < 768;
}

export function isBrowser() {
  return typeof window !== 'undefined';
}

export enum ThemeSetting {
  Dark = 'dark',
  Light = 'light',
  System = 'system',
}

export const settingsKey = 'app-settings';
export const settings = persistent(settingsKey, {
  theme: ThemeSetting.System,
  systemTheme: ThemeSetting.Light,
});

if (isBrowser()) {
  const dark = window.matchMedia('(prefers-color-scheme: dark)');

  if (dark.matches) {
    settings.systemTheme = ThemeSetting.Dark;
  } else {
    settings.systemTheme = ThemeSetting.Light;
  }

  dark.addEventListener('change', (e) => {
    settings.systemTheme = e.matches ? ThemeSetting.Dark : ThemeSetting.Light;
  });
}
