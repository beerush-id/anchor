import { type FC, useRef } from 'react';
import { flashNode } from '@lib/stats.js';
import { useSnapshot } from '@anchor/react';

export type RenderStatProp = {
  name: string;
  value: number;
};

export const RenderStatItem: FC<{ stat: RenderStatProp }> = ({ stat }) => {
  const ref = useRef(null);
  const snapshot = useSnapshot(stat);

  flashNode(ref.current);

  return (
    <div ref={ref} className="flex flex-col items-center px-4 text-center flex-1">
      <span className="text-slate-300 font-bold text">{snapshot.value}</span>
      <span className="text-slate-500 flex-1 text-xs font-medium">{snapshot.name}</span>
    </div>
  );
};
