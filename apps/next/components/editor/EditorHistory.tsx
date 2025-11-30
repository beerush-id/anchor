import { IconButton, Tooltip } from '@anchorlib/react-kit/components';
import { Redo, RotateCcw, Undo } from 'lucide-react';
import { debugRender, observer, useHistory } from '@anchorlib/react-classic';
import { editorApp } from '@utils/editor';
import { type FC, useRef } from 'react';

const EditorHistory: FC = observer(() => {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref);

  const history = useHistory(editorApp.currentStyle, { resettable: true });

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
}, 'EditorHistory');

export default EditorHistory;
