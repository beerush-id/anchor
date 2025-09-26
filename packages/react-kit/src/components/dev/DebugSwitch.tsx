import { useState } from 'react';
import { isDebugRenderer, setDebugRenderer } from '@anchorlib/react';
import { Bug, BugOff } from 'lucide-react';
import { Tooltip } from '../Tooltip.js';
import { classx } from '@utils/classx.js';

export function DebugSwitch() {
  const [debugMode, setDebugMode] = useState(isDebugRenderer());

  const handleToggle = () => {
    setDebugRenderer(!debugMode);
    setDebugMode(!debugMode);
  };

  return (
    <button onClick={handleToggle} className={classx('icon-button', 'button-alternative')}>
      {debugMode && <Bug size={16} />}
      {!debugMode && <BugOff size={16} />}
      <Tooltip>{debugMode ? 'Disable' : 'Enable'} Render Debugger</Tooltip>
    </button>
  );
}
