import type { RFC } from '@utils/types.js';
import { debugRender, resolveProps, useObserver } from '@anchorlib/react';
import { classx } from '@utils/index.js';
import { type TooltipOptions, useTooltip } from '@actions/index.js';
import type { HTMLAttributes } from 'react';

export type TooltipProps = TooltipOptions;

const { brand } = classx;

export const Tooltip: RFC<HTMLSpanElement, HTMLAttributes<HTMLSpanElement> & TooltipProps> = (props) => {
  const {
    children,
    xDir = 'between',
    yDir = 'below',
    className,
    ...rest
  } = useObserver(() => resolveProps(props), [props]);
  const ref = useTooltip({ xDir, yDir });
  debugRender(ref);

  const dirClasses = [xDir ? brand(`tooltip-x-${xDir}`) : '', yDir ? brand(`tooltip-y-${yDir}`) : ''];

  return (
    <span ref={ref} className={classx(brand('tooltip'), className, dirClasses)} {...rest}>
      {children}
    </span>
  );
};
