import { Button } from '../Button.js';
import { ClipboardCheck, ClipboardCopy } from 'lucide-react';
import { parseAllCss } from '@lib/editor.js';
import { debugRender } from '@anchor/react';
import { useRef, useState } from 'react';

export function EditorExport() {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref);
  const [success, setSuccess] = useState(false);

  const handleCopy = () => {
    const cssText = parseAllCss();
    navigator.clipboard.writeText(cssText).then(() => {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    });
  };

  return (
    <div ref={ref} className="flex items-center">
      <Button onClick={handleCopy} className="btn-alternate">
        {success ? <ClipboardCheck size={18} /> : <ClipboardCopy size={18} />}
        <span>Copy CSS</span>
      </Button>
    </div>
  );
}
