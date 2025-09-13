import React, { useEffect, useRef } from 'react';
import { derive } from '@anchorlib/core';

export type BoxProp = {
  x: number;
  scale: number;
};

export const BoxView: React.FC<{ box: BoxProp }> = ({ box }) => {
  const boxNode = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!boxNode.current) return;

    return derive.pipe(box, boxNode.current.style, ({ x, scale }) => {
      return {
        left: `${x}%`,
        transform: `translate3d(-50%, -50%, 0) rotate(${(x / 100) * 360}deg) scale(${scale})`,
      };
    });
  }, [box, boxNode]);

  return (
    <div className="p-6 bg-slate-950/50 min-h-[250px] flex items-center justify-center relative overflow-hidden">
      <div
        ref={boxNode}
        className="w-24 h-24 bg-gradient-to-br from-brand-orange to-pink-700 rounded-lg shadow-2xl shadow-purple-500/20"
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
      />
    </div>
  );
};
