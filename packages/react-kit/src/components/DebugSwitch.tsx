import { useRef, useState } from 'react';
import { debugRender, isDebugRenderer, setDebugRenderer } from '@anchorlib/react-classic';
import { Bug, BugOff } from 'lucide-react';
import { Tooltip } from './Tooltip.js';
import { Button } from './Button.js';

export function DebugSwitch() {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref);

  const [debugMode, setDebugMode] = useState(isDebugRenderer());

  const handleToggle = () => {
    setDebugRenderer(!debugMode);
    setDebugMode(!debugMode);
  };

  return (
    <Button onClick={handleToggle} className="btn-icon btn-alternate tool-btn">
      {debugMode && <Bug size={16} />}
      {!debugMode && <BugOff size={16} />}
      <Tooltip>{debugMode ? 'Disable' : 'Enable'} Render Debugger</Tooltip>
    </Button>
  );
}
