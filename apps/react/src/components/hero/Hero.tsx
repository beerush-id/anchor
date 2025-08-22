import { useEffect, useRef, useState } from 'react';
import { createBugs } from '../../lib/bugs.js';

export const Hero = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [bugs] = useState(() => {
    return createBugs(50, 125);
  });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      ref.current?.style.setProperty('--torch-x', e.clientX + 'px');
      ref.current?.style.setProperty('--torch-y', e.clientY + 'px');
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  });

  return (
    <section className="hero w-screen h-screen">
      <div ref={ref} className="bugs">
        {bugs.map((bug) => (
          <span
            className="bug-node"
            style={
              {
                '--bug-x': bug.x + 'px',
                '--bug-y': bug.y + 'px',
                '--bug-rotate': bug.rotate + 'deg',
                '--bug-delay': bug.delay + 's',
              } as React.CSSProperties
            }>
            🐞
          </span>
        ))}
      </div>
    </section>
  );
};
