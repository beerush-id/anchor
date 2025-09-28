'use client';

import EditorNodeList from './EditorNodeList';
import EditorCanvas from './EditorCanvas';
import EditorPanel from './EditorPanel';
import { Card, CardHeader, DebugSwitch } from '@anchorlib/react-kit/components';
import EditorHistory from './EditorHistory';
import { useRef } from 'react';
import { debugRender, useObserver } from '@anchorlib/react';
import { EditorExport } from './EditorExport';
import { Info, SwatchBook } from 'lucide-react';
import { editorApp, parseAllCss } from '@utils/editor';
import { isMobile } from '@anchorlib/react-kit/utils';
import Image from 'next/image.js';

export default function EditorApp() {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref);

  if (isMobile()) {
    return (
      <div className="flex flex-col gap-4">
        <Image src={`/images/editor.webp`} alt="CSS Editor Demo" />
        <p className="text-center px-4 text-sm">
          Open in a desktop browser to experience the live CSS Editor Demo app.
        </p>
      </div>
    );
  }

  return (
    <div ref={ref} className="flex flex-col w-full max-w-6xl mx-auto">
      <EditorOutput />
      <Card className="flex-1">
        <CardHeader>
          <h1 className="flex items-center gap-2">
            <SwatchBook />
            <span className="font-semibold">CSS Editor</span>
          </h1>
          <div className="flex-1 flex items-center">
            <DebugSwitch />
            <div className="flex items-center gap-1 ml-10 text-slate-600 dark:text-slate-300">
              <Info size={14} />
              <span className="text-xs italic">Red flashes is first render, blue flashes is re-render.</span>
            </div>
          </div>
          <EditorHistory />
          <EditorExport />
        </CardHeader>

        <div className="editor-app w-full flex items-stretch flex-1">
          <EditorNodeList />
          <EditorCanvas />
          <EditorPanel />
        </div>
      </Card>
    </div>
  );
}

function EditorOutput() {
  let content = useObserver(() => editorApp.currentCssContent);

  if (!content) {
    content = parseAllCss();
  }

  return <style id={'css-output'}>{content}</style>;
}
