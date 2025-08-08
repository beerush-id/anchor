import PanelCode from './ControlPanel.js?raw';
import BoxViewCode from './BoxView.js?raw';
import BoxPanelCode from './BoxPanel.js?raw';

import { CodeBlock } from '../CodeBlock.js';
import { memo } from 'react';

export const ControlPanelCode = memo(() => {
  const codeBlocks = [
    {
      name: 'ControlPanel.tsx',
      code: PanelCode,
    },
    {
      name: 'BoxPanel.tsx',
      code: BoxPanelCode,
    },
    {
      name: 'BoxView.tsx',
      code: BoxViewCode,
    },
  ];

  return (
    <>
      {codeBlocks.map((block) => (
        <div key={block.name} className="flex flex-col">
          <h4 className="text-slate-500 px-2 py-1 text-sm my-2">{block.name}</h4>
          <CodeBlock code={block.code} />
        </div>
      ))}
    </>
  );
});
