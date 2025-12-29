import { classx } from '@anchorkit/headless/utils';
import { template } from '@anchorlib/react';
import type { HTMLAttributes } from 'react';
import { ARK_COLOR, ARK_SIZE, ARK_VARIANT, type ArkColor, type ArkSize, type ArkVariant } from '../../lib/index.js';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  icon?: boolean;
  size?: ArkSize;
  color?: ArkColor;
  variant?: ArkVariant;
};

export const Badge = template<BadgeProps>(
  ({ className, size, icon, color, variant, ...props }) => (
    <span
      className={classx('ark-badge', {
        'ark-badge-sm': size === ARK_SIZE.sm,
        'ark-badge-md': size === ARK_SIZE.md,
        'ark-badge-lg': size === ARK_SIZE.lg,
        'ark-badge-info': color === ARK_COLOR.info,
        'ark-badge-primary': color === ARK_COLOR.primary,
        'ark-badge-success': color === ARK_COLOR.success,
        'ark-badge-warning': color === ARK_COLOR.warning,
        'ark-badge-destructive': color === ARK_COLOR.destructive,
        'ark-badge-icon': icon,
        'ark-badge-chip': variant === ARK_VARIANT.chip,
        'ark-badge-ghost': variant === ARK_VARIANT.ghost,
        'ark-badge-outline': variant === ARK_VARIANT.outline,
      })}
      {...props}
    ></span>
  ),
  'Badge'
);
