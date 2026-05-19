import { render, setup } from '@anchorlib/react';
import { getSettings } from '../lib/settings.js';

export const ThemeToggle = setup(() => {
  const app = getSettings();
  const toggle = () => app.toggleTheme();

  return render(
    () => (
      <button className="theme-toggle" onClick={toggle} data-theme={app.theme} aria-label="Toggle theme">
        {app.theme === 'dark' ? '🌙' : '☀️'}
      </button>
    ),
    'ThemeToggle'
  );
}, 'ThemeToggle');
