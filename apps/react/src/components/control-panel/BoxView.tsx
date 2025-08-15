import React, { memo, useEffect, useRef } from 'react';
import { derive } from '@anchor/core';

export type BoxProp = {
  x: number;
  scale: number;
};

export const BoxView: React.FC<{ box: BoxProp }> = memo(({ box }) => {
  const boxNode = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boxNode.current) return;

    return derive.pipe(box, boxNode.current.style, ({ x, scale }) => ({
      left: `${x}%`,
      transform: `translate3d(-50%, -50%, 0) rotate(${(x / 100) * 360}deg) scale(${scale})`,
    }));
  }, [boxNode]);

  return (
    <div className="p-6 bg-slate-950/50 min-h-[250px] flex items-center justify-center relative overflow-hidden">
      <div
        ref={boxNode}
        className="w-24 h-24 bg-gradient-to-br from-brand-orange to-brand-purple rounded-lg shadow-2xl shadow-purple-500/20"
        style={{ position: 'absolute', top: '50%', left: '50%' }}
      />
    </div>
  );
});
