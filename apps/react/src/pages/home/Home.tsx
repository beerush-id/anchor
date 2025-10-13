import { persistent } from '@anchorlib/storage';
import { subscribe } from '@anchorlib/core';
import { COLOR_THEMES } from '@anchorlib/headless-kit';
import { Bell, CircleUser } from '@icons/index.js';
import type { ChangeEventHandler } from 'react';
import { view } from '@anchorlib/react';
import { Badges } from './Badges.js';
import { Tabs } from './Tabs.js';
import { Radios } from './Radios.js';
import { Switches } from './Switches.js';
import { Checkboxes } from './Checkboxes.js';

const settings = persistent('settings', {
  theme: 'system',
  systemTheme: 'light',
  colorTheme: '',
});

if (typeof window !== 'undefined') {
  subscribe(settings, (settings) => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');

    COLOR_THEMES.filter((item) => item.className).forEach((item) =>
      document.documentElement.classList.remove(item.className)
    );

    if (settings.colorTheme) {
      document.documentElement.classList.add(settings.colorTheme);
    }
  });
}

export default function Home() {
  const handleColorChange: ChangeEventHandler<HTMLSelectElement> = (e) => {
    settings.colorTheme = e.target?.value;
  };

  const handleToggleDark = () => {
    settings.theme = settings.theme === 'dark' ? 'light' : 'dark';
  };

  const ThemeControl = view(() => (
    <div className="flex items-center gap-4 sticky top-0 bg-background z-50">
      <h1 className="text-2xl font-bold mb-4 flex-1">Component Preview</h1>
      <select className="ark-select" value={settings.colorTheme} onChange={handleColorChange}>
        {COLOR_THEMES.map((item) => (
          <option key={item.className} value={item.className}>
            {item.name}
          </option>
        ))}
      </select>
      <button className={'ark-button'} onClick={handleToggleDark}>
        <span>{settings.theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
      </button>
    </div>
  ));

  return (
    <>
      <main className="p-8">
        <ThemeControl />

        {/* Buttons */}
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-xl font-semibold mb-2">Buttons</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <button className="ark-button">Normal</button>
            <button className="ark-button ark-primary-button">Primary</button>
            <button className="ark-button ark-destructive-button">Destructive</button>
            <button className="ark-button ark-outline-button">Outline</button>
            <button className="ark-button ark-ghost-button">Ghost</button>
            <button className="ark-button ark-link-button">Link</button>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button className="ark-button" disabled>
              Normal
            </button>
            <button className="ark-button ark-primary-button" disabled>
              Primary
            </button>
            <button className="ark-button ark-destructive-button" disabled>
              Destructive
            </button>
            <button className="ark-button ark-outline-button" disabled>
              Outline
            </button>
            <button className="ark-button ark-ghost-button" disabled>
              Ghost
            </button>
            <button className="ark-button ark-link-button" disabled>
              Link
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center mt-4">
            <button className="ark-button ark-primary-button ark-sm-button">
              <CircleUser />
              <span>Small</span>
            </button>
            <button className="ark-button ark-primary-button">
              <CircleUser />
              <span>Default</span>
            </button>
            <button className="ark-button ark-primary-button ark-md-button">
              <CircleUser />
              <span>Medium</span>
            </button>
            <button className="ark-button ark-primary-button ark-lg-button">
              <CircleUser />
              <span>Large</span>
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center mt-4">
            <button className="ark-icon-button ark-sm-button">
              <CircleUser />
            </button>
            <button className="ark-icon-button">
              <CircleUser />
            </button>
            <button className="ark-icon-button ark-md-button">
              <CircleUser />
            </button>
            <button className="ark-icon-button ark-lg-button">
              <CircleUser />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 items-center mt-4">
            <div className="ark-button-group">
              <button className="ark-tool-button">
                <CircleUser />
              </button>
              <button className="ark-tool-button ark-active">
                <CircleUser />
              </button>
              <button className="ark-tool-button">
                <CircleUser />
              </button>
              <button className="ark-tool-button">
                <CircleUser />
              </button>
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="ark-card">
              <div className="ark-card-header">
                <h3 className="ark-card-title">Default Card</h3>
                <p className="ark-card-description">This is a default card.</p>
              </div>
              <div className="ark-card-content">
                <p>Card content goes here.</p>
              </div>
              <div className="ark-card-footer">
                <button className="ark-button ark-primary-button">Action</button>
              </div>
            </div>
            <div className="ark-card ark-elevated-card">
              <div className="ark-card-header">
                <h3 className="ark-card-title">Elevated Card</h3>
                <p className="ark-card-description">This is an elevated card.</p>
              </div>
            </div>
            <div className="ark-card ark-outlined-card">
              <div className="ark-card-header">
                <h3 className="ark-card-title">Outlined Card</h3>
                <p className="ark-card-description">This is an outlined card.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-2">Alerts</h2>
          <div className="space-y-4">
            <div className="ark-alert">
              <div className="ark-alert-icon">
                <Bell />
              </div>
              <div className="ark-alert-content">
                <h4 className="ark-alert-title">Default Alert</h4>
                <p className="ark-alert-description">This is a default alert.</p>
              </div>
            </div>
            <div className="ark-alert ark-destructive-alert">
              <div className="ark-alert-icon">
                <CircleUser />
              </div>
              <div className="ark-alert-content">
                <h4 className="ark-alert-title">Destructive Alert</h4>
                <p className="ark-alert-description">This is a destructive alert.</p>
              </div>
            </div>
            <div className="ark-alert ark-warning-alert">
              <div className="ark-alert-icon">
                <CircleUser />
              </div>
              <div className="ark-alert-content">
                <h4 className="ark-alert-title">Warning Alert</h4>
                <p className="ark-alert-description">This is a warning alert.</p>
              </div>
            </div>
            <div className="ark-alert ark-success-alert">
              <div className="ark-alert-icon">
                <CircleUser />
              </div>
              <div className="ark-alert-content">
                <h4 className="ark-alert-title">Success Alert</h4>
                <p className="ark-alert-description">This is a success alert.</p>
              </div>
            </div>
            <div className="ark-alert ark-info-alert">
              <div className="ark-alert-icon">
                <CircleUser />
              </div>
              <div className="ark-alert-content">
                <h4 className="ark-alert-title">Info Alert</h4>
                <p className="ark-alert-description">This is an info alert.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Inputs */}
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-xl font-semibold mb-2">Inputs</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input type="text" placeholder="Default" className="ark-input" />
            <input type="text" placeholder="Error" className="ark-input ark-input-error" />
            <input type="text" placeholder="Success" className="ark-input ark-input-success" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input type="text" placeholder="Disabled" className="ark-input" disabled />
            <input type="text" placeholder="Error Disabled" className="ark-input ark-input-error" disabled />
            <input type="text" placeholder="Success Disabled" className="ark-input ark-input-success" disabled />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input type="text" placeholder="Small" className="ark-input ark-input-sm" />
            <input type="text" placeholder="Normal" className="ark-input" />
            <input type="text" placeholder="Large" className="ark-input ark-input-lg" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input type="text" placeholder="Small" className="ark-tool-input" />
            <input type="text" placeholder="Small" className="ark-tool-input ark-input-error" />
            <input type="text" placeholder="Small" className="ark-tool-input ark-input-success" />
          </div>
        </div>

        {/* Textarea */}
        <div className="mb-8 flex flex-col gap-2">
          <h2 className="text-xl font-semibold mb-2">Textarea</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <textarea placeholder="Default" className="ark-textarea"></textarea>
            <textarea placeholder="Default" className="ark-textarea ark-textarea-error"></textarea>
            <textarea placeholder="Default" className="ark-textarea ark-textarea-success"></textarea>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <textarea placeholder="Default" className="ark-textarea" disabled></textarea>
            <textarea placeholder="Default" className="ark-textarea ark-textarea-error" disabled></textarea>
            <textarea placeholder="Default" className="ark-textarea ark-textarea-success" disabled></textarea>
          </div>
        </div>

        {/* Checkbox */}
        <Checkboxes />
        <Radios />
        <Switches />
        <Badges />
        <Tabs />
      </main>
    </>
  );
}
