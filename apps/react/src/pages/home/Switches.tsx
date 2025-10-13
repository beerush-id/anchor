import { Switch } from '@anchorkit/react/components/switch/Switch.js';

export function Switches() {
  return (
    <div className="mb-8">
      <h2 className="text-xl font-semibold mb-2">Switch</h2>
      <div className="flex gap-2">
        <Switch checked />
        <Switch />
        <Switch disabled checked />
        <Switch disabled />
      </div>
    </div>
  );
}
