import { useAction } from '@anchorlib/react';
import { classx } from '@utils/index.js';

const { brand } = classx;

export type TooltipOptions = {
  xDir?: 'before' | 'after' | 'between';
  yDir?: 'above' | 'below' | 'between';
};

export function useTooltip({ xDir = 'between', yDir = 'below' }: TooltipOptions = {}) {
  return useAction<HTMLSpanElement>((element) => {
    if (!element?.parentElement) return;

    const parent = element.parentElement;

    const mouseenter = () => {
      const { top, left, width, height } = parent.getBoundingClientRect();

      const x = xDir === 'before' ? -element.offsetWidth : xDir === 'after' ? width : width / 2;
      const y = yDir === 'above' ? -element.offsetHeight : yDir === 'below' ? height : height / 2;

      element.style.setProperty(brand('--tooltip-top'), `${y + top}px`);
      element.style.setProperty(brand('--tooltip-left'), `${x + left}px`);
      element.classList.add(brand('tooltip-visible'));
    };

    const mouseleave = () => element.classList.remove(brand('tooltip-visible'));

    parent.addEventListener('mouseenter', mouseenter);
    parent.addEventListener('mouseleave', mouseleave);

    return () => {
      parent.classList.remove(brand('tooltip-container'));
      parent.removeEventListener('mouseenter', mouseenter);
      parent.removeEventListener('mouseleave', mouseleave);
    };
  });
}
