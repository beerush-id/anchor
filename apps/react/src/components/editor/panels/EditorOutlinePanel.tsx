import { Eraser, GalleryThumbnails, Palette, Square, SquareDashed } from 'lucide-react';
import { Tooltip } from '../../Tooltip.js';
import { ColorPicker, Input, Toggle, ToggleGroup } from '@anchorlib/react/components';
import { useObserved, useWriter } from '@anchorlib/react';
import { editorApp, TOOL_ICON_SIZE } from '@lib/editor.js';
import { PanelColumn } from '../../PanelColumn.js';
import { PanelRow } from '../../PanelRow.js';

export default function EditorOutlinePanel() {
  const base = editorApp.current.style === editorApp.currentStyle ? {} : editorApp.current.style;
  const style = useObserved(() => editorApp.currentStyle);
  const styleWriter = useWriter(style, [
    'borderWidth',
    'borderStyle',
    'borderColor',
    'borderTopWidth',
    'borderRightWidth',
    'borderBottomWidth',
    'borderLeftWidth',
    'outlineWidth',
    'outlineStyle',
    'outlineColor',
  ]);

  return (
    <>
      <PanelRow>
        <PanelColumn label="Border">
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <Input
                type={'text'}
                bind={styleWriter}
                name={'borderWidth'}
                inherits={[base]}
                className={'anchor-input tool-input'}
                placeholder="default"
              />
              <Tooltip>Border Width</Tooltip>
            </label>
            <ColorPicker bind={styleWriter} name="borderColor" inherits={[base]} className="toggle-btn cursor-pointer">
              <Palette size={TOOL_ICON_SIZE} />
              <Tooltip>Border Color</Tooltip>
            </ColorPicker>
          </div>
        </PanelColumn>

        <PanelColumn label="Style">
          <ToggleGroup>
            <Toggle bind={styleWriter} name="borderStyle" value="none" inherits={[base]} className="toggle-btn">
              <Eraser size={TOOL_ICON_SIZE} />
              <Tooltip>None</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="borderStyle" value="solid" inherits={[base]} className="toggle-btn">
              <Square size={TOOL_ICON_SIZE} />
              <Tooltip>Solid</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="borderStyle" value="dashed" inherits={[base]} className="toggle-btn">
              <SquareDashed size={TOOL_ICON_SIZE} />
              <Tooltip>Dashed</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="borderStyle" value="dotted" inherits={[base]} className="toggle-btn">
              <GalleryThumbnails size={TOOL_ICON_SIZE} />
              <Tooltip>Dotted</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
      </PanelRow>

      <PanelRow>
        <PanelColumn label="Border Width">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <label className="cols-1">
              <Input
                type={'number'}
                bind={styleWriter}
                name={'borderTopWidth'}
                inherits={[base]}
                className={'anchor-input tool-input'}
                placeholder="Top"
                min={0}
                onChange={() => {
                  delete styleWriter.borderWidth;
                }}
              />
              <Tooltip>Top</Tooltip>
            </label>
            <label className="cols-1">
              <Input
                type={'number'}
                bind={styleWriter}
                name={'borderRightWidth'}
                inherits={[base]}
                className={'anchor-input tool-input'}
                placeholder="Right"
                min={0}
                onChange={() => {
                  delete styleWriter.borderWidth;
                }}
              />
              <Tooltip>Right</Tooltip>
            </label>
            <label className="cols-1">
              <Input
                type={'number'}
                bind={styleWriter}
                name={'borderBottomWidth'}
                inherits={[base]}
                className={'anchor-input tool-input'}
                placeholder="Bottom"
                min={0}
                onChange={() => {
                  delete styleWriter.borderWidth;
                }}
              />
              <Tooltip>Bottom</Tooltip>
            </label>
            <label className="cols-1">
              <Input
                type={'number'}
                bind={styleWriter}
                name={'borderLeftWidth'}
                inherits={[base]}
                className={'anchor-input tool-input'}
                placeholder="Left"
                min={0}
                onChange={() => {
                  delete styleWriter.borderWidth;
                }}
              />
              <Tooltip>Left</Tooltip>
            </label>
          </div>
        </PanelColumn>
      </PanelRow>

      <PanelRow>
        <PanelColumn label="Outline">
          <div className="flex items-center gap-2">
            <label className="flex-1">
              <Input
                type={'number'}
                bind={styleWriter}
                name={'outlineWidth'}
                inherits={[base]}
                className={'anchor-input tool-input'}
                placeholder="default"
              />
              <Tooltip>Outline Width</Tooltip>
            </label>
            <ColorPicker bind={styleWriter} name="outlineColor" inherits={[base]} className="toggle-btn cursor-pointer">
              <Palette size={TOOL_ICON_SIZE} />
              <Tooltip>Outline Color</Tooltip>
            </ColorPicker>
          </div>
        </PanelColumn>

        <PanelColumn label="Style">
          <ToggleGroup>
            <Toggle bind={styleWriter} name="outlineStyle" value="none" inherits={[base]} className="toggle-btn">
              <Eraser size={TOOL_ICON_SIZE} />
              <Tooltip>None</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="outlineStyle" value="solid" inherits={[base]} className="toggle-btn">
              <Square size={TOOL_ICON_SIZE} />
              <Tooltip>Solid</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="outlineStyle" value="dashed" inherits={[base]} className="toggle-btn">
              <SquareDashed size={TOOL_ICON_SIZE} />
              <Tooltip>Dashed</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="outlineStyle" value="dotted" inherits={[base]} className="toggle-btn">
              <GalleryThumbnails size={TOOL_ICON_SIZE} />
              <Tooltip>Dotted</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
      </PanelRow>
    </>
  );
}
