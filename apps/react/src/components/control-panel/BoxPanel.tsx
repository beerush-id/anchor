import React from 'react';
import type { BoxProp } from './BoxView.js';
import { Input } from '../Input.js';
import { observe } from '@anchorlib/react/view';

export const BoxPanel: React.FC<{ box: BoxProp }> = ({ box }) => {
  const XView = observe<HTMLLabelElement>(
    (ref) => (
      <label ref={ref} className="block text-sm font-medium text-slate-400">
        X Position: {box.x}%
      </label>
    ),
    'XLabel'
  );
  const ScaleView = observe<HTMLLabelElement>(
    (ref) => (
      <label ref={ref} className="block text-sm font-medium text-slate-400">
        Scale: {box.scale}
      </label>
    ),
    'ScaleLabel'
  );

  return (
    <div className="p-6">
      <h4 className="font-semibold mb-4">Control Panel</h4>
      <div className="space-y-4">
        <div>
          <XView />
          <Input
            type={'range'}
            bind={box}
            bindKey="x"
            min="0"
            max="100"
            step={0.01}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-orange"
          />
        </div>
        <div>
          <ScaleView />
          <Input
            type={'range'}
            bind={box}
            bindKey="scale"
            min="-2"
            max="2"
            step={0.01}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-purple"
          />
        </div>
      </div>
    </div>
  );
};
