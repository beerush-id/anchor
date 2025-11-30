import { type FC, useRef } from 'react';
import { debugRender, useDerived } from '@anchorlib/react-classic';

export type RenderStatProp = {
  name: string;
  value: number;
};

export const RenderStatItem: FC<{ stat: RenderStatProp }> = ({ stat }) => {
  const ref = useRef(null);
  const snapshot = useDerived(stat);

  debugRender(ref);

  return (
    <div ref={ref} className="flex flex-col items-center px-4 text-center flex-1">
      <p>
        <span className="font-semibold">{snapshot.value.toLocaleString()}</span>
        <span className="opacity-75">x</span>
      </p>
      <span className="text-slate-500 flex-1 text-xs font-medium">{snapshot.name}</span>
    </div>
  );
};
