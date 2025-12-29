import { classx } from '@anchorkit/headless/utils';
import { template } from '@anchorlib/react';
import { ARK_CONFIG } from '../lib/index.js';
import { type IconProps, iconSize } from './utils.js';

export const Setting = template<IconProps>(
  ({ className, size, fill, stroke, strokeWidth, strokeLinecap, strokeLinejoin, ...props }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={iconSize(size)}
      height={iconSize(size)}
      viewBox="0 0 24 24"
      fill={fill ?? 'none'}
      stroke={stroke ?? 'currentColor'}
      strokeWidth={strokeWidth ?? ARK_CONFIG.iconStrokeWidth}
      strokeLinecap={strokeLinecap ?? ARK_CONFIG.iconLineCap}
      strokeLinejoin={strokeLinejoin ?? ARK_CONFIG.iconLineJoin}
      className={classx('ark-icon', className)}
      {...props}
    >
      <path d="M14 17H5" />
      <path d="M19 7h-9" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  ),
  'SettingIcon'
);
