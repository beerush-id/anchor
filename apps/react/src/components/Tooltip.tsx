import { type FC, type ReactNode, useEffect, useRef, useState } from 'react';

export const Tooltip: FC<{ children: ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!ref.current?.parentElement) return;

    const parent = ref.current.parentElement as HTMLElement;
    parent.style.position = 'relative';

    const mouseenter = () => setShow(true);
    const mouseleave = () => setShow(false);

    parent.addEventListener('mouseenter', mouseenter);
    parent.addEventListener('mouseleave', mouseleave);

    return () => {
      parent.removeEventListener('mouseenter', mouseenter);
      parent.removeEventListener('mouseleave', mouseleave);
    };
  }, []);

  return (
    <span
      className={[
        'absolute',
        'top-full',
        'left-1/2',
        '-translate-x-1/2',
        'bg-black/90',
        'text-xs',
        'px-2',
        'py-1',
        'rounded-sm',
        'mt-2',
        'backdrop-blur-sm',
        'transition-all',
        'pointer-events-none',
        'whitespace-nowrap',
        'z-50',
        show ? 'opacity-100 visible' : 'opacity-0 invisible',
      ].join(' ')}
      ref={ref}>
      {children}
    </span>
  );
};
