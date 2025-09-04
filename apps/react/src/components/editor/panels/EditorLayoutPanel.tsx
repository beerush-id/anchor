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
import { ColorPicker, Toggle, ToggleGroup } from '@anchor/react/components';
import { useObserved, useWriter } from '@anchor/react';
import { editorApp, TOOL_ICON_SIZE } from '@lib/editor.js';
import { PanelColumn } from '../../PanelColumn.js';
import { PanelRow } from '../../PanelRow.js';

export default function EditorLayoutPanel() {
  const node = editorApp.current;
  const [style, display, direction] = useObserved(() => [
    editorApp.currentStyle,
    editorApp.currentStyle?.display,
    editorApp.currentStyle?.flexDirection,
  ]);
  const styleWriter = useWriter(style, ['display', 'alignItems', 'justifyContent', 'backgroundColor', 'flexDirection']);
  const isFlex = display === 'flex' || display === 'inline-flex';
  const isVertical = direction === 'column';

  return (
    <>
      <PanelRow>
        <PanelColumn label="Display">
          <ToggleGroup>
            <Toggle bind={styleWriter} name="display" value="block" className="toggle-btn">
              <Square size={TOOL_ICON_SIZE} />
              <Tooltip>Block</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="display" value="flex" className="toggle-btn">
              <LayoutPanelTop size={TOOL_ICON_SIZE} />
              <Tooltip>Flex</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="display" value="inline-flex" className="toggle-btn">
              <LayoutTemplate size={TOOL_ICON_SIZE} />
              <Tooltip>Inline Flex</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="display" value="grid" className="toggle-btn">
              <LayoutGrid size={TOOL_ICON_SIZE} />
              <Tooltip>Grid</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>

        <PanelColumn label="Direction">
          <ToggleGroup>
            <Toggle bind={styleWriter} name="flexDirection" value="row" className="toggle-btn" disabled={!isFlex}>
              <PanelTopBottomDashed size={TOOL_ICON_SIZE} />
              <Tooltip>Vertical</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="flexDirection" value="column" className="toggle-btn" disabled={!isFlex}>
              <PanelLeftRightDashed size={TOOL_ICON_SIZE} />
              <Tooltip>Horizontal</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>

        <PanelColumn label="Fill">
          <ColorPicker
            className="toggle-btn cursor-pointer"
            bind={styleWriter}
            name="backgroundColor"
            placeholder={`${node.style.backgroundColor ?? '#000000'}`}>
            <PaintBucket size={TOOL_ICON_SIZE} />
            <Tooltip>Background Color</Tooltip>
          </ColorPicker>
        </PanelColumn>
      </PanelRow>

      <PanelRow>
        <PanelColumn label="Align">
          <ToggleGroup>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'alignItems' : 'justifyContent'}
              value="flex-start"
              className="toggle-btn"
              disabled={!isFlex}>
              <AlignHorizontalJustifyStart size={TOOL_ICON_SIZE} />
              <Tooltip>Left</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'alignItems' : 'justifyContent'}
              value="center"
              className="toggle-btn"
              disabled={!isFlex}>
              <AlignHorizontalJustifyCenter size={TOOL_ICON_SIZE} />
              <Tooltip>Center</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'alignItems' : 'justifyContent'}
              value="flex-end"
              className="toggle-btn"
              disabled={!isFlex}>
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
              className="toggle-btn"
              disabled={!isFlex}>
              <AlignVerticalJustifyStart size={TOOL_ICON_SIZE} />
              <Tooltip>Top</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'justifyContent' : 'alignItems'}
              value="center"
              className="toggle-btn"
              disabled={!isFlex}>
              <AlignVerticalJustifyCenter size={TOOL_ICON_SIZE} />
              <Tooltip>Middle</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'justifyContent' : 'alignItems'}
              value="flex-end"
              className="toggle-btn"
              disabled={!isFlex}>
              <AlignVerticalJustifyEnd size={TOOL_ICON_SIZE} />
              <Tooltip>Bottom</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name={isVertical ? 'justifyContent' : 'alignItems'}
              value="stretch"
              className="toggle-btn"
              disabled={!isFlex}>
              {!isVertical && <StretchVertical size={TOOL_ICON_SIZE} />}
              {isVertical && <StretchHorizontal size={TOOL_ICON_SIZE} />}
              <Tooltip>Stretch</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
      </PanelRow>
    </>
  );
}
