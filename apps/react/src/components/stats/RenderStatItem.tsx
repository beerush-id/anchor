import React, { useRef } from 'react';
import { useDerived } from '@anchor/react';
import { flashNode } from './stats.js';

export type RenderStatProp = {
  name: string;
  value: number;
};

export const RenderStatItem: React.FC<{ stat: RenderStatProp }> = ({ stat }) => {
  const ref = useRef(null);
  const [item] = useDerived(stat);

  flashNode(ref.current);

  return (
    <div ref={ref} className="flex items-center gap-2 px-4">
      <span className="text-slate-400 flex-1">{item.name}:</span>
      <span className="text-slate-300">{item.value}</span>
    </div>
  );
};
