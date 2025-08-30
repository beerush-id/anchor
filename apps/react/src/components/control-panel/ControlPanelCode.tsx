import PanelCode from './ControlPanel.js?raw';
import BoxViewCode from './BoxView.js?raw';
import BoxPanelCode from './BoxPanel.js?raw';
import { memo } from 'react';
import { CodeViewer } from '../CodeViewer.js';

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

  return <CodeViewer items={codeBlocks} />;
});
