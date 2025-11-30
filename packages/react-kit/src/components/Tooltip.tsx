import type { EFC } from '@base/index.js';
import { resolveProps, useObserver } from '@anchorlib/react-classic';
import { classx } from '@utils/index.js';
import { type TooltipOptions, TooltipXDir, TooltipYDir, useTooltip } from '@actions/index.js';
import type { HTMLAttributes } from 'react';

export type TooltipProps = TooltipOptions;

const { brand } = classx;

export const Tooltip: EFC<HTMLAttributes<HTMLSpanElement> & TooltipProps, HTMLSpanElement> = (props) => {
  const {
    children,
    xDir = TooltipXDir.Between,
    yDir = TooltipYDir.Below,
    className,
    ...rest
  } = useObserver(() => resolveProps(props));
  const ref = useTooltip({ xDir, yDir });

  const dirClasses = [xDir ? brand(`tooltip-x-${xDir}`) : '', yDir ? brand(`tooltip-y-${yDir}`) : ''];

  return (
    <span ref={ref} className={classx(brand('tooltip'), className, dirClasses)} {...rest}>
      {children}
    </span>
  );
};
