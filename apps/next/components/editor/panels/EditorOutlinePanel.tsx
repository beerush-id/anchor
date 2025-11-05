import { Eraser, GalleryThumbnails, Palette, Square, SquareDashed } from 'lucide-react';
import { PanelColumn, PanelRow, Tooltip } from '@anchorlib/react-kit/components';
import { ColorPicker, Input, Toggle, ToggleGroup } from '@anchorlib/react/components';
import { useObserver, useWriter } from '@anchorlib/react';
import { editorApp, TOOL_ICON_SIZE } from '@utils/editor';

export default function EditorOutlinePanel() {
  const base = editorApp.current.style === editorApp.currentStyle ? {} : editorApp.current.style;
  const style = useObserver(() => editorApp.currentStyle);
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
                className={'ark-input tool-input'}
                placeholder="default"
              />
              <Tooltip>Border Width</Tooltip>
            </label>
            <ColorPicker
              bind={styleWriter}
              name="borderColor"
              inherits={[base]}
              className="ark-toggle-button cursor-pointer"
            >
              <Palette size={TOOL_ICON_SIZE} />
              <Tooltip>Border Color</Tooltip>
            </ColorPicker>
          </div>
        </PanelColumn>

        <PanelColumn label="Style">
          <ToggleGroup>
            <Toggle bind={styleWriter} name="borderStyle" value="none" inherits={[base]} className="ark-toggle-button">
              <Eraser size={TOOL_ICON_SIZE} />
              <Tooltip>None</Tooltip>
            </Toggle>
            <Toggle bind={styleWriter} name="borderStyle" value="solid" inherits={[base]} className="ark-toggle-button">
              <Square size={TOOL_ICON_SIZE} />
              <Tooltip>Solid</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="borderStyle"
              value="dashed"
              inherits={[base]}
              className="ark-toggle-button"
            >
              <SquareDashed size={TOOL_ICON_SIZE} />
              <Tooltip>Dashed</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="borderStyle"
              value="dotted"
              inherits={[base]}
              className="ark-toggle-button"
            >
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
                className={'ark-input tool-input'}
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
                className={'ark-input tool-input'}
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
                className={'ark-input tool-input'}
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
                className={'ark-input tool-input'}
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
                className={'ark-input tool-input'}
                placeholder="default"
              />
              <Tooltip>Outline Width</Tooltip>
            </label>
            <ColorPicker
              bind={styleWriter}
              name="outlineColor"
              inherits={[base]}
              className="ark-toggle-button cursor-pointer"
            >
              <Palette size={TOOL_ICON_SIZE} />
              <Tooltip>Outline Color</Tooltip>
            </ColorPicker>
          </div>
        </PanelColumn>

        <PanelColumn label="Style">
          <ToggleGroup>
            <Toggle bind={styleWriter} name="outlineStyle" value="none" inherits={[base]} className="ark-toggle-button">
              <Eraser size={TOOL_ICON_SIZE} />
              <Tooltip>None</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="outlineStyle"
              value="solid"
              inherits={[base]}
              className="ark-toggle-button"
            >
              <Square size={TOOL_ICON_SIZE} />
              <Tooltip>Solid</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="outlineStyle"
              value="dashed"
              inherits={[base]}
              className="ark-toggle-button"
            >
              <SquareDashed size={TOOL_ICON_SIZE} />
              <Tooltip>Dashed</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="outlineStyle"
              value="dotted"
              inherits={[base]}
              className="ark-toggle-button"
            >
              <GalleryThumbnails size={TOOL_ICON_SIZE} />
              <Tooltip>Dotted</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
      </PanelRow>
    </>
  );
}
