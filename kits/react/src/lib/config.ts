import { anchor, mutable } from '@anchorlib/core';

export type ArkConfig = {
  iconSize: number;
  iconColor: string;
  iconStrokeWidth: number;
  iconLineCap: CanvasLineCap;
  iconLineJoin: CanvasLineJoin;
};

export const ARK_CONFIG = mutable<ArkConfig>({
  iconSize: 24,
  iconColor: 'currentColor',
  iconStrokeWidth: 2,
  iconLineCap: 'round',
  iconLineJoin: 'round',
});

export function configure(config: Partial<ArkConfig>) {
  anchor.assign(ARK_CONFIG, config);
}
