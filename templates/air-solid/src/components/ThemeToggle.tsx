import { derived } from '@anchorlib/solid';
import { getSettings } from '../lib/settings.js';

export function ThemeToggle() {
  const app = getSettings();
  const toggle = () => app.toggleTheme();
  const icon = derived(() => (app.theme === 'dark' ? '🌙' : '☀️'));

  return (
    <button class="theme-toggle" onClick={toggle} data-theme={app.theme} aria-label="Toggle theme">
      {icon.value}
    </button>
  );
}
