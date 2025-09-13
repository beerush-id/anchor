import { type FC, useRef } from 'react';
import { debugRender, useDerived } from '@anchorlib/react';

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
        <span className="text-slate-300 font-bold text">{snapshot.value.toLocaleString()}</span>
        <span className="text-sm text-slate-400 font-semibold">x</span>
      </p>
      <span className="text-slate-500 flex-1 text-xs font-medium">{snapshot.name}</span>
    </div>
  );
};
