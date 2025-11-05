import { classx, settings, ThemeSetting } from '@utils/index.js';
import { DarkMode, LightMode, SystemMode } from '@icons/index.js';
import { observer, useVariable } from '@anchorlib/react';
import { useEffect } from 'react';
import { Tooltip } from './Tooltip.js';

export const ThemeSwitch = observer(() => {
  const [current] = useVariable(ThemeSetting.System);

  const switchMode = (theme: ThemeSetting) => {
    settings.theme = current.value = theme;
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
        onClick={() => switchMode(ThemeSetting.Light)}
      >
        <LightMode />
        <Tooltip>Switch to Light Mode</Tooltip>
      </button>
      <button
        type="button"
        aria-label="Switch to system theme"
        className={classx({ active: current.value === ThemeSetting.System })}
        onClick={() => switchMode(ThemeSetting.System)}
      >
        <SystemMode />
        <Tooltip>Follow System Theme</Tooltip>
      </button>
      <button
        type="button"
        aria-label="Switch to dark mode"
        className={classx({ active: current.value === ThemeSetting.Dark })}
        onClick={() => switchMode(ThemeSetting.Dark)}
      >
        <DarkMode />
        <Tooltip>Switch to Dark Mode</Tooltip>
      </button>
    </div>
  );
}, 'ThemeSwitch');
