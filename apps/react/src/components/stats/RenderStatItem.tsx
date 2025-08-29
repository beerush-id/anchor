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
    <div ref={ref} className="flex items-center gap-2 px-4">
      <span className="text-slate-400 flex-1">{snapshot.name}:</span>
      <span className="text-slate-300">{snapshot.value}</span>
    </div>
  );
};
