import { Button } from '../Button.js';
import { ClipboardCheck, ClipboardCopy } from 'lucide-react';
import { parseAll } from '@lib/editor.js';
import { debugRender } from '@anchor/react';
import { useRef, useState } from 'react';

export function EditorExport() {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref.current);
  const [success, setSuccess] = useState(false);

  const handleCopy = () => {
    const cssText = parseAll();
    navigator.clipboard.writeText(cssText).then(() => {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    });
  };

  return (
    <div ref={ref} className="flex items-center">
      <Button onClick={handleCopy}>
        {success ? <ClipboardCheck size={18} /> : <ClipboardCopy size={18} />}
        <span>Copy CSS</span>
      </Button>
    </div>
  );
}
