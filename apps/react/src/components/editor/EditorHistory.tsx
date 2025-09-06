import { IconButton } from '../Button.js';
import { Redo, RotateCcw, Undo } from 'lucide-react';
import { Tooltip } from '../Tooltip.js';
import { debugRender, useHistory, useObserved } from '@anchor/react';
import { editorApp } from '@lib/editor.js';
import { useRef } from 'react';

export default function EditorHistory() {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref);

  const currentStyle = useObserved(() => editorApp.currentStyle);
  const history = useHistory(currentStyle, { resettable: true });

  return (
    <div ref={ref} className="flex items-center gap-4">
      <IconButton disabled={!history.canBackward} onClick={history.backward}>
        <Undo size={20} />
        <Tooltip>Undo</Tooltip>
      </IconButton>
      <IconButton disabled={!history.canForward} onClick={history.forward}>
        <Redo size={20} />
        <Tooltip>Redo</Tooltip>
      </IconButton>
      <IconButton disabled={!history.canReset} onClick={history.reset}>
        <RotateCcw size={20} />
        <Tooltip>Reset</Tooltip>
      </IconButton>
    </div>
  );
}
