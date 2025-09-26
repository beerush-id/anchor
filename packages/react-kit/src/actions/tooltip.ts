import { useAction } from '@anchorlib/react';
import { classx } from '@utils/index.js';

const { brand } = classx;

/**
 * Enum for horizontal tooltip positioning relative to the parent element
 * @enum {string}
 */
export enum TooltipXDir {
  /** Positions tooltip before the parent element */
  Before = 'before',
  /** Positions tooltip after the parent element */
  After = 'after',
  /** Centers tooltip horizontally relative to the parent element (default) */
  Between = 'between',
  /** Positions tooltip to the left of the parent element */
  Left = 'left',
  /** Positions tooltip to the right of the parent element */
  Right = 'right',
}

/**
 * Enum for vertical tooltip positioning relative to the parent element
 * @enum {string}
 */
export enum TooltipYDir {
  /** Positions tooltip above the parent element */
  Above = 'above',
  /** Positions tooltip below the parent element (default) */
  Below = 'below',
  /** Centers tooltip vertically relative to the parent element */
  Between = 'between',
  /** Positions tooltip to the top of the parent element */
  Top = 'top',
  /** Positions tooltip to the bottom of the parent element */
  Bottom = 'bottom',
}

/**
 * Configuration options for tooltip positioning
 */
export type TooltipOptions = {
  /** Horizontal positioning of the tooltip relative to the parent element */
  xDir?: TooltipXDir;
  /** Vertical positioning of the tooltip relative to the parent element */
  yDir?: TooltipYDir;
};

/**
 * A custom React hook that creates a tooltip action for positioning and displaying tooltips.
 *
 * @param options - Configuration options for tooltip positioning
 * @param options.xDir - Horizontal positioning of the tooltip relative to the parent element
 *   - 'before': Positions tooltip to the left of the parent element
 *   - 'after': Positions tooltip to the right of the parent element
 *   - 'between': Centers tooltip horizontally relative to the parent element (default)
 * @param options.yDir - Vertical positioning of the tooltip relative to the parent element
 *   - 'above': Positions tooltip above the parent element
 *   - 'below': Positions tooltip below the parent element (default)
 *   - 'between': Centers tooltip vertically relative to the parent element
 *
 * @returns A function that can be used as a ref callback to attach the tooltip behavior to an element
 */
export function useTooltip({ xDir = TooltipXDir.Between, yDir = TooltipYDir.Below }: TooltipOptions = {}) {
  return useAction<HTMLSpanElement>((element) => {
    if (!element?.parentElement) return;

    const parent = element.parentElement;

    const mouseenter = () => {
      const { top, left, width, height } = parent.getBoundingClientRect();

      const x =
        xDir === TooltipXDir.Left
          ? left
          : xDir === TooltipXDir.Right
            ? left + width - element.offsetWidth
            : xDir === TooltipXDir.Before
              ? -element.offsetWidth
              : xDir === TooltipXDir.After
                ? width
                : width / 2;
      const y =
        yDir === TooltipYDir.Top
          ? top
          : yDir === TooltipYDir.Bottom
            ? top + height - element.offsetHeight
            : yDir === TooltipYDir.Above
              ? -element.offsetHeight
              : yDir === TooltipYDir.Below
                ? height
                : height / 2;

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
