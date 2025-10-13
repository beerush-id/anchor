import { debugRender, useDerivedRef, useObserver, useRefTrap, useWriter } from '@anchorlib/react';
import { type CssNode, editorApp, parseCss, stylize, TOOL_ICON_SIZE } from '@lib/editor.js';
import { useRef } from 'react';
import { CodeBlock } from '../CodeBlock.js';
import { Toggle, ToggleGroup } from '@anchorlib/react/components';
import { view } from '@anchorlib/react/view';
import { Braces, SquareDashedBottomCode, SquareMousePointer } from 'lucide-react';
import { Tooltip } from '../Tooltip.js';

export default function EditorCanvas() {
  const ref = useRefTrap<HTMLDivElement>(null, (element) => {
    if (element) {
      element.style.setProperty('--canvas-height', `${element.offsetHeight}px`);
    }

    return element;
  });
  debugRender(ref);

  const viewWriter = useWriter(editorApp, ['viewMode']);

  const EditorPreview = view(() => {
    debugRender(ref);

    const mode = editorApp.viewMode;

    if (editorApp.viewMode === 'canvas') {
      return <CanvasView />;
    }

    const content = mode === 'code' ? editorApp.css() : editorApp.json();
    return <CodeBlock code={content} lang={mode === 'code' ? 'css' : 'json'} className="code-block-fit" />;
  }, 'EditorPreview');

  return (
    <div ref={ref} className="flex flex-col flex-1 relative">
      <EditorPreview />
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
  const previewRef = useRef(null);
  debugRender(previewRef);

  const [node, style] = useObserver(() => [editorApp.current, editorApp.currentStyle]);
  const defaultRef = useDerivedRef<typeof node, HTMLDivElement>(node, (snap, element) => {
    if (!element) return;
    stylize(element, snap.style);
  });
  const currentRef = useDerivedRef<typeof editorApp, HTMLDivElement>(editorApp, (snap, element) => {
    if (!element) return;
    stylize(element, { ...snap.current?.style, ...snap.currentStyle });
  });
  const outputRef = useDerivedRef<typeof node, HTMLStyleElement>(node, (_, element) => {
    if (!element) return;
    element.innerHTML = parseCss(node as CssNode);
  });

  const isInput = node?.type === 'input';
  const isSelect = node?.type === 'select';
  const isGeneral = node?.type === 'general';

  return (
    <div ref={previewRef} className="flex-1 canvas-content gap-4 select-none">
      {node.style !== style && (
        <div className="main canvas-element bg-black/20">
          <div ref={defaultRef}>
            <span>Normal</span>
          </div>
        </div>
      )}
      <div className="main canvas-element bg-black/20">
        <div ref={currentRef}>
          <span>Current</span>
        </div>
      </div>
      <div className="main canvas-element bg-black/20">
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
      <style ref={outputRef} id={'current-css-output'}></style>
    </div>
  );
}
