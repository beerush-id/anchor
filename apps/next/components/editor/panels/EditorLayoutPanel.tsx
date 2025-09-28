import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  CornerDownLeft,
  CornerDownRight,
  GalleryHorizontalEnd,
  GalleryVerticalEnd,
  LayoutGrid,
  LayoutPanelTop,
  LayoutTemplate,
  MonitorOff,
  MoveRight,
  PaintBucket,
  Square,
  SquareSquare,
  StretchHorizontal,
  StretchVertical,
} from 'lucide-react';
import { PanelColumn, PanelRow, Tooltip } from '@anchorlib/react-kit/components';
import { ColorPicker, Toggle, ToggleGroup } from '@anchorlib/react/components';
import { observe, useObserver, useWriter } from '@anchorlib/react';
import { editorApp, TOOL_ICON_SIZE } from '@utils/editor';

const FLEX_KEYS = ['flex', 'inline-flex'] as (string | number | undefined)[];

export default function EditorLayoutPanel() {
  const base = editorApp.current.style === editorApp.currentStyle ? {} : editorApp.current.style;
  const style = useObserver(() => editorApp.currentStyle);
  const styleWriter = useWriter(style, [
    'display',
    'alignItems',
    'justifyContent',
    'backgroundColor',
    'flexDirection',
    'flexWrap',
  ]);

  const isFlex = () => FLEX_KEYS.includes(style.display) || FLEX_KEYS.includes(base.display);
  const isVertical = () =>
    (style.flexDirection ?? base.flexDirection) === 'column' ||
    (style.flexDirection ?? base.flexDirection) === 'column-reverse';

  const FlexDirectionPanel = observe(() => {
    return (
      <PanelColumn label="Direction">
        <ToggleGroup>
          <Toggle bind={styleWriter} name="flexDirection" value="row" inherits={[base]} className="ark-toggle-button">
            <GalleryHorizontalEnd size={TOOL_ICON_SIZE} />
            <Tooltip>Horizontal</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name="flexDirection"
            value="row-reverse"
            inherits={[base]}
            className="ark-toggle-button">
            <GalleryHorizontalEnd size={TOOL_ICON_SIZE} className="-scale-x-100" />
            <Tooltip>Horizontal Reverse</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name="flexDirection"
            value="column"
            inherits={[base]}
            className="ark-toggle-button">
            <GalleryVerticalEnd size={TOOL_ICON_SIZE} />
            <Tooltip>Vertical</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name="flexDirection"
            value="column-reverse"
            inherits={[base]}
            className="ark-toggle-button">
            <GalleryVerticalEnd size={TOOL_ICON_SIZE} className="-scale-y-100" />
            <Tooltip>Vertical Reverse</Tooltip>
          </Toggle>
        </ToggleGroup>
      </PanelColumn>
    );
  });

  const FLexWrapPanel = observe(() => {
    return (
      <PanelColumn label="Flex Wrap">
        <ToggleGroup>
          <Toggle bind={styleWriter} name="flexWrap" value="wrap" inherits={[base]} className="ark-toggle-button">
            <CornerDownLeft size={TOOL_ICON_SIZE} />
            <Tooltip>Wrap</Tooltip>
          </Toggle>
          <Toggle bind={styleWriter} name="flexWrap" value="nowrap" inherits={[base]} className="ark-toggle-button">
            <MoveRight size={TOOL_ICON_SIZE} />
            <Tooltip>No Wrap</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name="flexWrap"
            value="wrap-reverse"
            inherits={[base]}
            className="ark-toggle-button">
            <CornerDownRight size={TOOL_ICON_SIZE} />
            <Tooltip>Wrap Reverse</Tooltip>
          </Toggle>
        </ToggleGroup>
      </PanelColumn>
    );
  });

  const AlignItemsPanel = observe(() => {
    const vertical = isVertical();

    return (
      <PanelColumn label="Align">
        <ToggleGroup>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'alignItems' : 'justifyContent'}
            value="flex-start"
            inherits={[base]}
            className="ark-toggle-button">
            <AlignHorizontalJustifyStart size={TOOL_ICON_SIZE} />
            <Tooltip>Left</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'alignItems' : 'justifyContent'}
            value="center"
            inherits={[base]}
            className="ark-toggle-button">
            <AlignHorizontalJustifyCenter size={TOOL_ICON_SIZE} />
            <Tooltip>Center</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'alignItems' : 'justifyContent'}
            value="flex-end"
            inherits={[base]}
            className="ark-toggle-button">
            <AlignHorizontalJustifyEnd size={TOOL_ICON_SIZE} />
            <Tooltip>Right</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'alignItems' : 'justifyContent'}
            value="stretch"
            inherits={[base]}
            className="ark-toggle-button">
            <StretchHorizontal size={TOOL_ICON_SIZE} />
            <Tooltip>Stretch</Tooltip>
          </Toggle>
        </ToggleGroup>
      </PanelColumn>
    );
  });

  const JustifyContentPanel = observe(() => {
    const vertical = isVertical();

    return (
      <PanelColumn label="Vertical Align">
        <ToggleGroup>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'justifyContent' : 'alignItems'}
            value="flex-start"
            inherits={[base]}
            className="ark-toggle-button">
            <AlignVerticalJustifyStart size={TOOL_ICON_SIZE} />
            <Tooltip>Top</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'justifyContent' : 'alignItems'}
            value="center"
            inherits={[base]}
            className="ark-toggle-button">
            <AlignVerticalJustifyCenter size={TOOL_ICON_SIZE} />
            <Tooltip>Middle</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'justifyContent' : 'alignItems'}
            value="flex-end"
            inherits={[base]}
            className="ark-toggle-button">
            <AlignVerticalJustifyEnd size={TOOL_ICON_SIZE} />
            <Tooltip>Bottom</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'justifyContent' : 'alignItems'}
            value="stretch"
            inherits={[base]}
            className="ark-toggle-button">
            <StretchVertical size={TOOL_ICON_SIZE} />
            <Tooltip>Stretch</Tooltip>
          </Toggle>
        </ToggleGroup>
      </PanelColumn>
    );
  });

  const AlignmentPanel = observe(() => {
    if (!isFlex()) return;

    return (
      <>
        <PanelRow>
          <FlexDirectionPanel />
          <AlignItemsPanel />
        </PanelRow>
        <PanelRow>
          <FLexWrapPanel />
          <JustifyContentPanel />
        </PanelRow>
      </>
    );
  });

  return (
    <>
      <PanelRow>
        <PanelColumn label="Display">
          <ToggleGroup>
            <Toggle bind={styleWriter} name="display" value="block" inherits={[base]} className="ark-toggle-button">
              <Square size={TOOL_ICON_SIZE} />
              <Tooltip>Block</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="display" value="flex" inherits={[base]} className="ark-toggle-button">
              <LayoutPanelTop size={TOOL_ICON_SIZE} />
              <Tooltip>Flex</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="display"
              value="inline-flex"
              inherits={[base]}
              className="ark-toggle-button">
              <LayoutTemplate size={TOOL_ICON_SIZE} />
              <Tooltip>Inline Flex</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="display" value="grid" inherits={[base]} className="ark-toggle-button">
              <LayoutGrid size={TOOL_ICON_SIZE} />
              <Tooltip>Grid</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="display"
              value="inline-block"
              inherits={[base]}
              className="ark-toggle-button">
              <SquareSquare size={TOOL_ICON_SIZE} />
              <Tooltip>Inline Block</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="display" value="none" inherits={[base]} className="ark-toggle-button">
              <MonitorOff size={TOOL_ICON_SIZE} />
              <Tooltip>None</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>

        <PanelColumn label="Fill">
          <ColorPicker
            bind={styleWriter}
            name="backgroundColor"
            inherits={[base]}
            className="ark-toggle-button cursor-pointer">
            <PaintBucket size={TOOL_ICON_SIZE} />
            <Tooltip>Background Color</Tooltip>
          </ColorPicker>
        </PanelColumn>
      </PanelRow>

      <AlignmentPanel />
    </>
  );
}
