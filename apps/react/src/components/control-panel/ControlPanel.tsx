import React, { useState } from 'react';
import { Card } from '../Card.js';
import { useAnchor } from '@anchor/react';
import { BoxPanel } from './BoxPanel.js';
import { BoxView } from './BoxView.js';
import { ControlPanelCode } from './ControlPanelCode.js';
import { CardHeader } from '../CardHeader.js';
import { CodeBlock } from '../CodeBlock.js';

export const ControlPanel: React.FC = () => {
  const [showCode, setShowCode] = useState(false);
  const [box] = useAnchor({ x: 50, scale: 1 });

  return (
    <div className="mt-12">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-slate-200 flex-1">Anchor Pipe</h3>
          <button className="anchor-btn btn-alternate" onClick={() => setShowCode(!showCode)}>
            {showCode ? 'Hide Code' : 'Show Code'}
          </button>
        </CardHeader>
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <BoxPanel box={box} />
          <BoxView box={box} />
        </div>
        {!showCode && <LiveCode />}
        <div className="bg-slate-950">{showCode && <ControlPanelCode />}</div>
      </Card>
    </div>
  );
};

const LiveCode = () => {
  return (
    <CodeBlock
      code={`// Pipe state directly to the element's style.
derive.pipe(state, element.style, ({ x, scale }) => ({
  left: \`\${ x }%\`,
  transform: \`translate3d(-50%, -50%, 0) rotate(\${ (x / 100) * 360 }deg) scale(\${ scale })\`,
}));`}
    />
  );
};
