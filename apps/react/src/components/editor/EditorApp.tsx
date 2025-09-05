import EditorNodeList from './EditorNodeList';
import EditorCanvas from './EditorCanvas';
import EditorPanel from './EditorPanel';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import EditorHistory from './EditorHistory.js';
import { useRef } from 'react';
import { debugRender } from '@anchor/react';
import { EditorExport } from './EditorExport.js';
import { SwatchBook } from 'lucide-react';
import { DebugSwitch } from '../DebugSwitch.js';

export default function EditorApp() {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref.current);

  return (
    <div ref={ref} className="px-8 max-w-7xl mx-auto flex flex-col w-screen">
      <Card className="flex-1">
        <CardHeader>
          <h1 className="flex items-center gap-2">
            <SwatchBook />
            <span className="font-semibold">CSS Editor</span>
          </h1>
          <div className="flex-1 flex items-center">
            <DebugSwitch />
            <span className="text-xs text-slate-300 italic ml-4 font-semibold">
              NOTE: Red flashes means the component is re-rendering.
            </span>
          </div>
          <EditorExport />
          <EditorHistory />
        </CardHeader>

        <div className="w-full flex items-stretch flex-1">
          <EditorNodeList />
          <EditorCanvas />
          <EditorPanel />
        </div>
      </Card>
    </div>
  );
}
