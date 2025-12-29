import { ARK_COLOR, ARK_SIZE, ARK_VARIANT, type ArkSize, type ArkVariant } from '@anchorkit/react';
import { Badge, BtnSize, ButtonGroup, ToggleButton } from '@anchorkit/react/components';
import { $bind, mutable, setup } from '@anchorlib/react';
import { CircleUser } from '@icons/CircleUser.js';

export const Badges = setup(() => {
  const setting = mutable({
    color: ARK_COLOR.info,
    variant: '' as ArkVariant,
    size: '' as ArkSize,
  });

  return (
    <div className="mb-8 flex flex-col gap-2">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold">Badges</h2>
        <div className="flex items-center gap-4">
          <ButtonGroup value={$bind(setting, 'color')}>
            <ToggleButton name={ARK_COLOR.info} size={BtnSize.sm}>
              Info
            </ToggleButton>
            <ToggleButton name={ARK_COLOR.success} size={BtnSize.sm}>
              Success
            </ToggleButton>
            <ToggleButton name={ARK_COLOR.warning} size={BtnSize.sm}>
              Warning
            </ToggleButton>
            <ToggleButton name={ARK_COLOR.destructive} size={BtnSize.sm}>
              Destructive
            </ToggleButton>
          </ButtonGroup>
          <ButtonGroup value={$bind(setting, 'size')}>
            <ToggleButton name={ARK_SIZE.sm} size={BtnSize.sm}>
              Small
            </ToggleButton>
            <ToggleButton name={ARK_SIZE.md} size={BtnSize.sm}>
              Medium
            </ToggleButton>
            <ToggleButton name={ARK_SIZE.lg} size={BtnSize.sm}>
              Large
            </ToggleButton>
          </ButtonGroup>
          <ButtonGroup value={$bind(setting, 'variant')}>
            <ToggleButton name={ARK_VARIANT.outline} size={BtnSize.sm}>
              Outline
            </ToggleButton>
            <ToggleButton name={ARK_VARIANT.chip} size={BtnSize.sm}>
              Chip
            </ToggleButton>
          </ButtonGroup>
        </div>
      </div>
      <div className="ark-card">
        <div className="ark-card-content flex items-center justify-center gap-2">
          <Badge icon size={() => setting.size} variant={() => setting.variant} color={() => setting.color}>
            <CircleUser />
          </Badge>
          <Badge size={() => setting.size} variant={() => setting.variant} color={() => setting.color}>
            <CircleUser />
            <span>Badge</span>
          </Badge>
          <Badge size={() => setting.size} variant={() => setting.variant} color={() => setting.color}>
            <span>Badge</span>
          </Badge>
        </div>
      </div>
    </div>
  );
}, 'Badges');
