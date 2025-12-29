import { COLOR_THEMES } from '@anchorkit/headless';
import {
  Accordion,
  AccordionContent,
  AccordionGroup,
  AccordionTrigger,
} from '@anchorkit/react/components/accordion/index.js';
import { subscribe } from '@anchorlib/core';
import { view } from '@anchorlib/react-classic';
import { persistent } from '@anchorlib/storage';
import { Bell, CircleUser } from '@icons/index.js';
import type { ChangeEventHandler } from 'react';
import { Badges } from './Badges.js';
import { Buttons } from './Buttons.js';
import { Checkboxes } from './Checkboxes.js';
import { TextInputs } from './Inputs.js';
import { Radios } from './Radios.js';
import { Switches } from './Switches.js';
import { Tabs } from './Tabs.js';
import { TextAreas } from './TextAreas.js';

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
      <button type={'button'} className={'ark-button'} onClick={handleToggleDark}>
        <span>{settings.theme === 'dark' ? 'Light' : 'Dark'} Mode</span>
      </button>
    </div>
  ));

  return (
    <main className="p-8">
      <ThemeControl />

      {/* Accordion */}
      <div className="mb-8 flex flex-col gap-2">
        <h2 className="text-xl font-semibold mb-2">Accordions</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <AccordionGroup>
            <Accordion name="1" expanded>
              <AccordionTrigger>
                <span>Product Information</span>
              </AccordionTrigger>
              <AccordionContent>
                <p>
                  Our flagship product combines cutting-edge technology with sleek design. Built with premium materials,
                  it offers unparalleled performance and reliability.
                </p>
                <p>
                  Key features include advanced processing capabilities, and an intuitive user interface designed for
                  both beginners and experts.
                </p>
              </AccordionContent>
            </Accordion>
            <Accordion name="2">
              <AccordionTrigger>
                <span>Shipping Details</span>
              </AccordionTrigger>
              <AccordionContent>
                <p>
                  We offer worldwide shipping through trusted courier partners. Standard delivery takes 3-5 business
                  days, while express shipping ensures delivery within 1-2 business days.
                </p>
                <p>
                  All orders are carefully packaged and fully insured. Track your shipment in real-time through our
                  dedicated tracking portal.
                </p>
              </AccordionContent>
            </Accordion>
            <Accordion name="3">
              <AccordionTrigger>
                <span>Return Policy</span>
              </AccordionTrigger>
              <AccordionContent>
                <p>
                  We stand behind our products with a comprehensive 30-day return policy. If you're not completely
                  satisfied, simply return the item in its original condition.
                </p>
                <p>
                  Our hassle-free return process includes free return shipping and full refunds processed within 48
                  hours of receiving the returned item.
                </p>
              </AccordionContent>
            </Accordion>
          </AccordionGroup>
        </div>
      </div>

      {/* Buttons */}
      <div className="mb-8 flex flex-col gap-2">
        <h2 className="text-xl font-semibold mb-2">Buttons</h2>
        <Buttons />
      </div>
      <Badges />

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
              <button type={'button'} className="ark-button ark-primary-button">
                Action
              </button>
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
        <TextInputs />
      </div>

      {/* Textarea */}
      <div className="mb-8 flex flex-col gap-2">
        <h2 className="text-xl font-semibold mb-2">Textarea</h2>
        <TextAreas />
      </div>

      {/* Checkbox */}
      <Checkboxes />
      <Radios />
      <Switches />
      <Tabs />
    </main>
  );
}
