import React, { useState } from 'react';
import { Card } from '../Card.js';
import { useObject } from '@anchor/react';
import { BoxPanel } from './BoxPanel.js';
import { BoxView } from './BoxView.js';
import { ControlPanelCode } from './ControlPanelCode.js';
import { CardHeader } from '../CardHeader.js';

export const ControlPanel: React.FC = () => {
  const [showCode, setShowCode] = useState(false);

  // Use empty array as deps to avoid re-rendering.
  const [box] = useObject(
    {
      x: 50,
      scale: 1,
    },
    []
  );

  console.log('Rendering control panel');

  return (
    <div className="mt-12">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-200 flex-1">Anchor Pipe</h3>
          <button className="bg-slate-900 text-white px-4 py-2 rounded-md" onClick={() => setShowCode(!showCode)}>
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        </CardHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <BoxPanel box={box} />
          <BoxView box={box} />
        </div>
        <div className="bg-slate-950">{showCode && <ControlPanelCode />}</div>
      </Card>
    </div>
  );
};
