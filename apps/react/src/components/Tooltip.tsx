import { type FC, type ReactNode, useEffect, useRef, useState } from 'react';

export const Tooltip: FC<{ children: ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!ref.current?.parentElement) return;

    const parent = ref.current.parentElement as HTMLElement;
    parent.style.position = 'relative';

    const mouseenter = () => {
      const { top, left, width, height } = parent.getBoundingClientRect();

      ref.current?.style.setProperty('--tooltip-top', `${top + height}px`);
      ref.current?.style.setProperty('--tooltip-left', `${width / 2 + left}px`);

      setShow(true);
    };
    const mouseleave = () => setShow(false);

    parent.addEventListener('mouseenter', mouseenter);
    parent.addEventListener('mouseleave', mouseleave);

    return () => {
      parent.removeEventListener('mouseenter', mouseenter);
      parent.removeEventListener('mouseleave', mouseleave);
    };
  }, []);

  return (
    <span ref={ref} className={['tooltip', show ? 'opacity-100 visible' : 'opacity-0 invisible'].join(' ')}>
      {children}
    </span>
  );
};
