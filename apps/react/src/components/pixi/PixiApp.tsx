import { Application, type ApplicationOptions } from 'pixi.js';
import { type FC, type ReactNode, useRef, useState } from 'react';
import { type IPixiApp, PixiContext } from '../../lib/pixi.js';
import { useAnchor } from '@anchor/react';

export type PixiAppProps = {
  options?: ApplicationOptions;
  children?: ReactNode;
};

export const PixiApp: FC<PixiAppProps> = ({ options, children }) => {
  const appRef = useRef(null);
  const [instance] = useState(() => {
    return new Application();
  });
  const [pixi] = useAnchor<IPixiApp>(
    {
      instance,
      status: 'init',
    },
    { recursive: false, deps: [] }
  );

  console.log(options);

  console.log('App', pixi);

  return (
    <PixiContext value={pixi}>
      <div ref={appRef} className="pixi-app w-screen h-screen">
        {children}
        <span>Test App</span>
      </div>
    </PixiContext>
  );
};
