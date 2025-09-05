import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CaseLower,
  CaseSensitive,
  CaseUpper,
  Ellipsis,
  Italic,
  PanelBottomDashed,
  Strikethrough,
  Type,
  Underline,
} from 'lucide-react';
import { Tooltip } from '../../Tooltip.js';
import { ColorPicker, Input, Select, Toggle, ToggleGroup } from '@anchor/react/components';
import { useObserved, useWriter } from '@anchor/react';
import { editorApp, TOOL_ICON_SIZE } from '@lib/editor.js';
import { PanelColumn } from '../../PanelColumn.js';
import { PanelRow } from '../../PanelRow.js';

export default function EditorTextPanel() {
  const root = editorApp.rootStyle;
  const node = editorApp.current;
  const style = useObserved(() => editorApp.currentStyle);
  const styleWriter = useWriter(style, [
    'color',
    'fontSize',
    'fontFamily',
    'fontWeight',
    'fontStyle',
    'textAlign',
    'textTransform',
    'textDecoration',
  ]);

  return (
    <>
      <PanelRow>
        <PanelColumn label="Font family">
          <Select bind={styleWriter} name="fontFamily" className="anchor-input tool-input pr-4">
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Verdana">Verdana</option>
          </Select>
        </PanelColumn>
        <PanelColumn className="flex-1" label="Font size">
          <Input
            type={'number'}
            bind={styleWriter}
            name={'fontSize'}
            inherits={[node.style, root]}
            className={'anchor-input tool-input cols-1'}
            placeholder="default"
          />
        </PanelColumn>
      </PanelRow>

      <PanelRow>
        <PanelColumn label="Font style">
          <ToggleGroup>
            <Toggle
              bind={styleWriter}
              name="fontWeight"
              value="bold"
              inherits={[node.style, root]}
              className="toggle-btn">
              <Bold size={TOOL_ICON_SIZE} />
              <Tooltip>Bold</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="fontStyle"
              value="italic"
              inherits={[node.style, root]}
              className="toggle-btn">
              <Italic size={TOOL_ICON_SIZE} />
              <Tooltip>Italic</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
        <PanelColumn label="Align text">
          <ToggleGroup>
            <Toggle
              bind={styleWriter}
              name="textAlign"
              value="left"
              inherits={[node.style, root]}
              className="toggle-btn">
              <AlignLeft size={TOOL_ICON_SIZE} />
              <Tooltip>Left</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textAlign"
              value="center"
              inherits={[node.style, root]}
              className="toggle-btn">
              <AlignCenter size={TOOL_ICON_SIZE} />
              <Tooltip>Center</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textAlign"
              value="right"
              inherits={[node.style, root]}
              className="toggle-btn">
              <AlignRight size={TOOL_ICON_SIZE} />
              <Tooltip>Right</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textAlign"
              value="justify"
              inherits={[node.style, root]}
              className="toggle-btn">
              <AlignJustify size={TOOL_ICON_SIZE} />
              <Tooltip>Justify</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
        <PanelColumn label="Color">
          <ColorPicker
            bind={styleWriter}
            name="color"
            inherits={[node.style, root]}
            className="toggle-btn cursor-pointer">
            <Type size={TOOL_ICON_SIZE} />
            <Tooltip>Text Color</Tooltip>
          </ColorPicker>
        </PanelColumn>
      </PanelRow>

      <PanelRow>
        <PanelColumn label="Text transform">
          <ToggleGroup>
            <Toggle
              bind={styleWriter}
              name="textTransform"
              value="lowercase"
              inherits={[node.style, root]}
              className="toggle-btn">
              <CaseLower size={TOOL_ICON_SIZE} />
              <Tooltip>lowercase</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textTransform"
              value="capitalize"
              inherits={[node.style, root]}
              className="toggle-btn">
              <CaseSensitive size={TOOL_ICON_SIZE} />
              <Tooltip>Titlecase</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textTransform"
              value="uppercase"
              inherits={[node.style, root]}
              className="toggle-btn">
              <CaseUpper size={TOOL_ICON_SIZE} />
              <Tooltip>UPPERCASE</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
        <PanelColumn label="Decoration">
          <ToggleGroup>
            <Toggle
              bind={styleWriter}
              name="textDecoration"
              value="line-through"
              inherits={[node.style, root]}
              className="toggle-btn">
              <Strikethrough size={TOOL_ICON_SIZE} />
              <Tooltip>Strikethrough</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textDecoration"
              value="underline"
              inherits={[node.style, root]}
              className="toggle-btn">
              <Underline size={TOOL_ICON_SIZE} />
              <Tooltip>Underline</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textDecoration"
              value="dashed"
              inherits={[node.style, root]}
              className="toggle-btn">
              <PanelBottomDashed size={TOOL_ICON_SIZE} />
              <Tooltip>Dashed</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textDecoration"
              value="dotted"
              inherits={[node.style, root]}
              className="toggle-btn">
              <Ellipsis size={TOOL_ICON_SIZE} />
              <Tooltip>Dotted</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
      </PanelRow>
    </>
  );
}
