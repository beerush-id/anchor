import { debugRender, useMicrotask, useObserved, useSnapshot, useWriter } from '@anchor/react';
import { editorApp, parseAll, TOOL_ICON_SIZE } from '@lib/editor.js';
import { useRef } from 'react';
import { CodeBlock } from '../CodeBlock.js';
import { Toggle, ToggleGroup } from '@anchor/react/components';
import { Braces, SquareDashedBottomCode, SquareMousePointer } from 'lucide-react';
import { Tooltip } from '../Tooltip.js';

export default function EditorCanvas() {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref.current);

  const [viewMode] = useObserved(() => [editorApp.viewMode]);
  const viewWriter = useWriter(editorApp, ['viewMode']);

  return (
    <div ref={ref} className="flex flex-col flex-1 relative">
      {viewMode === 'canvas' && <CanvasView />}
      {viewMode === 'code' && <CodeView />}
      {viewMode === 'json' && <CodeView mode={'json'} />}
      <ToggleGroup className="absolute bottom-4 right-4">
        <Toggle bind={viewWriter} name="viewMode" value="canvas" className="toggle-btn">
          <SquareMousePointer size={TOOL_ICON_SIZE} />
          <Tooltip>Canvas View</Tooltip>
        </Toggle>
        <Toggle bind={viewWriter} name="viewMode" value="code" className="toggle-btn">
          <SquareDashedBottomCode size={TOOL_ICON_SIZE} />
          <Tooltip>CSS View</Tooltip>
        </Toggle>
        <Toggle bind={viewWriter} name="viewMode" value="json" className="toggle-btn">
          <Braces size={TOOL_ICON_SIZE} />
          <Tooltip>JSON View</Tooltip>
        </Toggle>
      </ToggleGroup>
    </div>
  );
}

export function CanvasView() {
  const styleRef = useRef<HTMLStyleElement>(null);
  const designRef = useRef(null);
  const previewRef = useRef(null);

  debugRender(designRef.current);
  debugRender(previewRef.current);

  const [schedule] = useMicrotask(10);
  const [node] = useObserved(() => [editorApp.current]);

  const style = useSnapshot(editorApp, (snap) => ({ ...snap.current?.style, ...snap.currentStyle }));
  for (const [key, value] of Object.entries(style)) {
    if (!value) {
      delete style[key as never];
    }
  }

  if (node) {
    schedule(() => {
      if (!styleRef.current) return;
      styleRef.current.innerHTML = parseAll();
    });
  }

  const isInput = node?.type === 'input';
  const isSelect = node?.type === 'select';
  const isGeneral = node?.type === 'general';

  return (
    <div className="flex-1 canvas-content gap-4 select-none main">
      <div ref={designRef} className="canvas-element bg-black/20">
        <div style={style as never}>
          <span>Design</span>
        </div>
      </div>
      <div ref={previewRef} className="canvas-element bg-black/20">
        {isGeneral && (
          <div tabIndex={1} className={node?.selector?.replace('.', '')}>
            <span>Live preview</span>
          </div>
        )}
        {isInput && <input placeholder="Live preview" className={node?.selector?.replace('.', '')} />}
        {isSelect && (
          <select className={node?.selector?.replace('.', '')}>
            <option value={1}>Option 1</option>
            <option value={2}>Option 2</option>
            <option value={3}>Option 3</option>
            <option value={4}>Option 4</option>
            <option value={5}>Option 5</option>
          </select>
        )}
      </div>
      <style ref={styleRef}></style>
    </div>
  );
}

export function CodeView({ mode = 'css' }: { mode?: 'css' | 'json' }) {
  const content = mode === 'css' ? parseAll() : JSON.stringify(editorApp.nodes, null, 2);
  return <CodeBlock code={content} lang={mode} className="code-block-fit" />;
}
