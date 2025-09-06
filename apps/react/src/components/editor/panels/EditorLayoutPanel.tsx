import {
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  LayoutGrid,
  LayoutPanelTop,
  LayoutTemplate,
  PaintBucket,
  PanelLeftRightDashed,
  PanelTopBottomDashed,
  Square,
  StretchHorizontal,
  StretchVertical,
} from 'lucide-react';
import { Tooltip } from '../../Tooltip.js';
import { ColorPicker, reactive, Toggle, ToggleGroup } from '@anchor/react/components';
import { useObserved, useWriter } from '@anchor/react';
import { editorApp, TOOL_ICON_SIZE } from '@lib/editor.js';
import { PanelColumn } from '../../PanelColumn.js';
import { PanelRow } from '../../PanelRow.js';

const FLEX_KEYS = ['flex', 'inline-flex'] as (string | number | undefined)[];

export default function EditorLayoutPanel() {
  const base = editorApp.current.style === editorApp.currentStyle ? {} : editorApp.current.style;
  const style = useObserved(() => editorApp.currentStyle);
  const styleWriter = useWriter(style, ['display', 'alignItems', 'justifyContent', 'backgroundColor', 'flexDirection']);

  const isFlex = () => FLEX_KEYS.includes(style.display) || FLEX_KEYS.includes(base.display);

  const DisplayPanel = reactive(() => {
    return (
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
        </ToggleGroup>
      </PanelColumn>
    );
  });

  const DirectionPanel = reactive(() => {
    const flex = isFlex();

    return (
      <PanelColumn label="Direction">
        <ToggleGroup>
          <Toggle
            bind={styleWriter}
            name="flexDirection"
            value="row"
            inherits={[base]}
            className="toggle-btn"
            disabled={!flex}>
            <PanelTopBottomDashed size={TOOL_ICON_SIZE} />
            <Tooltip>Horizontal</Tooltip>
          </Toggle>
          <Toggle
            bind={styleWriter}
            name="flexDirection"
            value="column"
            inherits={[base]}
            className="toggle-btn"
            disabled={!flex}>
            <PanelLeftRightDashed size={TOOL_ICON_SIZE} />
            <Tooltip>Vertical</Tooltip>
          </Toggle>
        </ToggleGroup>
      </PanelColumn>
    );
  });

  const ColorPanel = reactive(() => {
    return (
      <PanelColumn label="Fill">
        <ColorPicker bind={styleWriter} name="backgroundColor" inherits={[base]} className="toggle-btn cursor-pointer">
          <PaintBucket size={TOOL_ICON_SIZE} />
          <Tooltip>Background Color</Tooltip>
        </ColorPicker>
      </PanelColumn>
    );
  });

  const AlignmentPanel = reactive(() => {
    const flex = isFlex();
    const isVertical = (style.flexDirection ?? base.flexDirection) === 'column';

    return (
      <PanelRow>
        <PanelColumn label="Align">
          <ToggleGroup>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'alignItems' : 'justifyContent'}
              value="flex-start"
              inherits={[base]}
              className="toggle-btn"
              disabled={!flex}>
              <AlignHorizontalJustifyStart size={TOOL_ICON_SIZE} />
              <Tooltip>Left</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'alignItems' : 'justifyContent'}
              value="center"
              inherits={[base]}
              className="toggle-btn"
              disabled={!flex}>
              <AlignHorizontalJustifyCenter size={TOOL_ICON_SIZE} />
              <Tooltip>Center</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'alignItems' : 'justifyContent'}
              value="flex-end"
              inherits={[base]}
              className="toggle-btn"
              disabled={!flex}>
              <AlignHorizontalJustifyEnd size={TOOL_ICON_SIZE} />
              <Tooltip>Right</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>

        <PanelColumn label="Vertical Align">
          <ToggleGroup>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'justifyContent' : 'alignItems'}
              value="flex-start"
              inherits={[base]}
              className="toggle-btn"
              disabled={!flex}>
              <AlignVerticalJustifyStart size={TOOL_ICON_SIZE} />
              <Tooltip>Top</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'justifyContent' : 'alignItems'}
              value="center"
              inherits={[base]}
              className="toggle-btn"
              disabled={!flex}>
              <AlignVerticalJustifyCenter size={TOOL_ICON_SIZE} />
              <Tooltip>Middle</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'justifyContent' : 'alignItems'}
              value="flex-end"
              inherits={[base]}
              className="toggle-btn"
              disabled={!flex}>
              <AlignVerticalJustifyEnd size={TOOL_ICON_SIZE} />
              <Tooltip>Bottom</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'justifyContent' : 'alignItems'}
              value="stretch"
              inherits={[base]}
              className="toggle-btn"
              disabled={!flex}>
              {!isVertical && <StretchVertical size={TOOL_ICON_SIZE} />}
              {isVertical && <StretchHorizontal size={TOOL_ICON_SIZE} />}
              <Tooltip>Stretch</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
      </PanelRow>
    );
  });

  const LayoutPanel = reactive(() => {
    return (
      <>
        <PanelRow>
          <DisplayPanel />
          <DirectionPanel />
          <ColorPanel />
        </PanelRow>
        <AlignmentPanel />
      </>
    );
  });

  return <LayoutPanel />;
}
