import { classx, settings, settingsKey, ThemeSetting } from '@utils/index.js';
import { DarkMode, LightMode, SystemMode } from '@icons/index.js';
import { observable } from '@anchorlib/react/view';
import { useVariable } from '@anchorlib/react';
import { useEffect } from 'react';
import { anchor } from '@anchorlib/core';
import { Tooltip } from './Tooltip.js';

export const ThemeSwitch = observable(() => {
  const [current] = useVariable(ThemeSetting.System);

  const switchMode = (theme: ThemeSetting) => {
    if (theme === ThemeSetting.System) {
      document.documentElement.classList.remove(settings.systemTheme === ThemeSetting.Dark ? 'light' : 'dark');
      document.documentElement.classList.add(settings.systemTheme);
    } else if (theme === ThemeSetting.Dark) {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }

    settings.theme = current.value = theme;
    document.cookie = `${settingsKey}=${JSON.stringify(anchor.read(settings))}; path=/; max-age=31536000;`;
  };

  useEffect(() => {
    current.value = settings.theme;
  });

  return (
    <div className={classx.brand('theme-switch')}>
      <button
        type="button"
        aria-label="Switch to light mode"
        className={classx({ active: current.value === ThemeSetting.Light })}
        onClick={() => switchMode(ThemeSetting.Light)}>
        <LightMode />
        <Tooltip>Switch to Light Mode</Tooltip>
      </button>
      <button
        type="button"
        aria-label="Switch to system theme"
        className={classx({ active: current.value === ThemeSetting.System })}
        onClick={() => switchMode(ThemeSetting.System)}>
        <SystemMode />
        <Tooltip>Follow System Theme</Tooltip>
      </button>
      <button
        type="button"
        aria-label="Switch to dark mode"
        className={classx({ active: current.value === ThemeSetting.Dark })}
        onClick={() => switchMode(ThemeSetting.Dark)}>
        <DarkMode />
        <Tooltip>Switch to Dark Mode</Tooltip>
      </button>
    </div>
  );
}, 'ThemeSwitch');
