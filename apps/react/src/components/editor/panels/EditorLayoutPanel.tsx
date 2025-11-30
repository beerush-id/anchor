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
import { Tooltip } from '../../Tooltip.js';
import { ColorPicker, Toggle, ToggleGroup } from '@anchorlib/react-classic/components';
import { view } from '@anchorlib/react-classic/view';
import { useObserver, useWriter } from '@anchorlib/react-classic';
import { editorApp, TOOL_ICON_SIZE } from '@lib/editor.js';
import { PanelColumn } from '../../PanelColumn.js';
import { PanelRow } from '../../PanelRow.js';

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

  const FlexDirectionPanel = view(() => {
    return (
      <PanelColumn label="Direction">
        <ToggleGroup>
          <Toggle bind={styleWriter} name="flexDirection" value="row" inherits={[base]} className="toggle-btn">
            <GalleryHorizontalEnd size={TOOL_ICON_SIZE} />
            <Tooltip>Horizontal</Tooltip>
          </Toggle>
          <Toggle bind={styleWriter} name="flexDirection" value="row-reverse" inherits={[base]} className="toggle-btn">
            <GalleryHorizontalEnd size={TOOL_ICON_SIZE} className="-scale-x-100" />
            <Tooltip>Horizontal Reverse</Tooltip>
          </Toggle>
          <Toggle bind={styleWriter} name="flexDirection" value="column" inherits={[base]} className="toggle-btn">
            <GalleryVerticalEnd size={TOOL_ICON_SIZE} />
            <Tooltip>Vertical</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name="flexDirection"
            value="column-reverse"
            inherits={[base]}
            className="toggle-btn"
          >
            <GalleryVerticalEnd size={TOOL_ICON_SIZE} className="-scale-y-100" />
            <Tooltip>Vertical Reverse</Tooltip>
          </Toggle>
        </ToggleGroup>
      </PanelColumn>
    );
  });

  const FLexWrapPanel = view(() => {
    return (
      <PanelColumn label="Flex Wrap">
        <ToggleGroup>
          <Toggle bind={styleWriter} name="flexWrap" value="wrap" inherits={[base]} className="toggle-btn">
            <CornerDownLeft size={TOOL_ICON_SIZE} />
            <Tooltip>Wrap</Tooltip>
          </Toggle>
          <Toggle bind={styleWriter} name="flexWrap" value="nowrap" inherits={[base]} className="toggle-btn">
            <MoveRight size={TOOL_ICON_SIZE} />
            <Tooltip>No Wrap</Tooltip>
          </Toggle>
          <Toggle bind={styleWriter} name="flexWrap" value="wrap-reverse" inherits={[base]} className="toggle-btn">
            <CornerDownRight size={TOOL_ICON_SIZE} />
            <Tooltip>Wrap Reverse</Tooltip>
          </Toggle>
        </ToggleGroup>
      </PanelColumn>
    );
  });

  const AlignItemsPanel = view(() => {
    const vertical = isVertical();

    return (
      <PanelColumn label="Align">
        <ToggleGroup>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'alignItems' : 'justifyContent'}
            value="flex-start"
            inherits={[base]}
            className="toggle-btn"
          >
            <AlignHorizontalJustifyStart size={TOOL_ICON_SIZE} />
            <Tooltip>Left</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'alignItems' : 'justifyContent'}
            value="center"
            inherits={[base]}
            className="toggle-btn"
          >
            <AlignHorizontalJustifyCenter size={TOOL_ICON_SIZE} />
            <Tooltip>Center</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'alignItems' : 'justifyContent'}
            value="flex-end"
            inherits={[base]}
            className="toggle-btn"
          >
            <AlignHorizontalJustifyEnd size={TOOL_ICON_SIZE} />
            <Tooltip>Right</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'alignItems' : 'justifyContent'}
            value="stretch"
            inherits={[base]}
            className="toggle-btn"
          >
            <StretchHorizontal size={TOOL_ICON_SIZE} />
            <Tooltip>Stretch</Tooltip>
          </Toggle>
        </ToggleGroup>
      </PanelColumn>
    );
  });

  const JustifyContentPanel = view(() => {
    const vertical = isVertical();

    return (
      <PanelColumn label="Vertical Align">
        <ToggleGroup>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'justifyContent' : 'alignItems'}
            value="flex-start"
            inherits={[base]}
            className="toggle-btn"
          >
            <AlignVerticalJustifyStart size={TOOL_ICON_SIZE} />
            <Tooltip>Top</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'justifyContent' : 'alignItems'}
            value="center"
            inherits={[base]}
            className="toggle-btn"
          >
            <AlignVerticalJustifyCenter size={TOOL_ICON_SIZE} />
            <Tooltip>Middle</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'justifyContent' : 'alignItems'}
            value="flex-end"
            inherits={[base]}
            className="toggle-btn"
          >
            <AlignVerticalJustifyEnd size={TOOL_ICON_SIZE} />
            <Tooltip>Bottom</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name={vertical ? 'justifyContent' : 'alignItems'}
            value="stretch"
            inherits={[base]}
            className="toggle-btn"
          >
            <StretchVertical size={TOOL_ICON_SIZE} />
            <Tooltip>Stretch</Tooltip>
          </Toggle>
        </ToggleGroup>
      </PanelColumn>
    );
  });

  const AlignmentPanel = view(() => {
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
            <Toggle bind={styleWriter} name="display" value="block" inherits={[base]} className="toggle-btn">
              <Square size={TOOL_ICON_SIZE} />
              <Tooltip>Block</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="display" value="flex" inherits={[base]} className="toggle-btn">
              <LayoutPanelTop size={TOOL_ICON_SIZE} />
              <Tooltip>Flex</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="display" value="inline-flex" inherits={[base]} className="toggle-btn">
              <LayoutTemplate size={TOOL_ICON_SIZE} />
              <Tooltip>Inline Flex</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="display" value="grid" inherits={[base]} className="toggle-btn">
              <LayoutGrid size={TOOL_ICON_SIZE} />
              <Tooltip>Grid</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="display" value="inline-block" inherits={[base]} className="toggle-btn">
              <SquareSquare size={TOOL_ICON_SIZE} />
              <Tooltip>Inline Block</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="display" value="none" inherits={[base]} className="toggle-btn">
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
            className="toggle-btn cursor-pointer"
          >
            <PaintBucket size={TOOL_ICON_SIZE} />
            <Tooltip>Background Color</Tooltip>
          </ColorPicker>
        </PanelColumn>
      </PanelRow>

      <AlignmentPanel />
    </>
  );
}
