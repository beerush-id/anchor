import {
  BtnColor,
  BtnSize,
  BtnVariant,
  Button,
  type ButtonColor,
  ButtonGroup,
  type ButtonSize,
  type ButtonVariant,
  IconButton,
  Tab,
  TabButton,
  TabContent,
  TabList,
  ToggleButton,
  ToolButton,
} from '@anchorkit/react/components';
import { $use, bind, mutable, setup, snippet } from '@anchorlib/react';
import { CircleUser } from '@icons/CircleUser.js';

export const Buttons = setup(() => {
  const size = mutable<ButtonSize>(BtnSize.default);
  const color = mutable<ButtonColor>(BtnColor.default);
  const variant = mutable<ButtonVariant>(BtnVariant.default);
  const activeTab = mutable('normal');

  const Content = snippet<{ text: string; disabled?: boolean }>(({ text, disabled }) => (
    <div className={'flex flex-wrap gap-2 items-center justify-center p-lg h-32'}>
      <IconButton disabled={disabled} color={$use(color)} size={$use(size)} variant={$use(variant)}>
        <CircleUser />
      </IconButton>
      <Button disabled={disabled} color={$use(color)} size={$use(size)} variant={$use(variant)}>
        {text}
      </Button>
      <Button disabled={disabled} color={$use(color)} size={$use(size)} variant={$use(variant)}>
        <CircleUser />
        <span>{text}</span>
      </Button>
      <ButtonGroup disabled={disabled}>
        <ToolButton name={'a'} size={$use(size)}>
          <CircleUser />
        </ToolButton>
        <ToolButton name={'b'} size={$use(size)}>
          <CircleUser />
        </ToolButton>
        <ToolButton name={'c'} size={$use(size)}>
          <CircleUser />
        </ToolButton>
      </ButtonGroup>
    </div>
  ));

  return (
    <Tab value={bind(activeTab)}>
      <div className="flex items-center gap-4 w-full">
        <TabList>
          <TabButton name={'normal'}>Normal</TabButton>
          <TabButton name={'disabled'}>Disabled</TabButton>
        </TabList>
        <div className="flex-1"></div>
        <ButtonGroup value={bind(color)}>
          <ToggleButton name={BtnColor.primary} size={BtnSize.sm}>
            Primary
          </ToggleButton>
          <ToggleButton name={BtnColor.destructive} size={BtnSize.sm}>
            Destructive
          </ToggleButton>
        </ButtonGroup>
        <ButtonGroup value={bind(size)}>
          <ToggleButton name={BtnSize.sm} size={BtnSize.sm}>
            Small
          </ToggleButton>
          <ToggleButton name={BtnSize.md} size={BtnSize.sm}>
            Medium
          </ToggleButton>
          <ToggleButton name={BtnSize.lg} size={BtnSize.sm}>
            Large
          </ToggleButton>
        </ButtonGroup>
        <ButtonGroup value={bind(variant)}>
          <ToggleButton name={BtnVariant.outline} size={BtnSize.sm}>
            Outline
          </ToggleButton>
          <ToggleButton name={BtnVariant.ghost} size={BtnSize.sm}>
            Ghost
          </ToggleButton>
          <ToggleButton name={BtnVariant.link} size={BtnSize.sm}>
            Link
          </ToggleButton>
        </ButtonGroup>
      </div>

      <TabContent name={'normal'}>
        <Content text={'Normal'} />
      </TabContent>

      <TabContent name={'disabled'}>
        <Content text={'Disabled'} disabled />
      </TabContent>
    </Tab>
  );
}, 'Buttons');
