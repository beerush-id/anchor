import React from 'react';
import type { BoxProp } from './BoxView.js';
import { observable } from '@anchor/react/components';

export const BoxPanel: React.FC<{ box: BoxProp }> = observable(({ box }) => {
  return (
    <div className="p-6">
      <h4 className="font-semibold mb-4">Control Panel</h4>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-400">X Position: {box.x}%</label>
          <input
            type="range"
            min="0"
            max="100"
            step={0.01}
            value={box.x}
            onChange={(e) => (box.x = parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-orange"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400">Scale: {box.scale}</label>
          <input
            type="range"
            min={-2}
            max={2}
            step={0.01}
            value={box.scale}
            onChange={(e) => (box.scale = parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-purple"
          />
        </div>
      </div>
    </div>
  );
});
