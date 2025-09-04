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
            className={'anchor-input tool-input cols-1'}
            placeholder={`${root.fontSize || 'default'}`}
          />
        </PanelColumn>
      </PanelRow>

      <PanelRow>
        <PanelColumn label="Font style">
          <ToggleGroup>
            <Toggle
              data-inherit={root.fontWeight === 'bold'}
              bind={styleWriter}
              name="fontWeight"
              value="bold"
              className="toggle-btn">
              <Bold size={TOOL_ICON_SIZE} />
              <Tooltip>Bold</Tooltip>
            </Toggle>
            <Toggle
              data-inherit={root.fontStyle === 'italic'}
              bind={styleWriter}
              name="fontStyle"
              value="italic"
              className="toggle-btn">
              <Italic size={TOOL_ICON_SIZE} />
              <Tooltip>Italic</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
        <PanelColumn label="Align text">
          <ToggleGroup>
            <Toggle
              data-inherit={root.textAlign === 'left'}
              bind={styleWriter}
              name="textAlign"
              value="left"
              className="toggle-btn">
              <AlignLeft size={TOOL_ICON_SIZE} />
              <Tooltip>Left</Tooltip>
            </Toggle>
            <Toggle
              data-inherit={root.textAlign === 'center'}
              bind={styleWriter}
              name="textAlign"
              value="center"
              className="toggle-btn">
              <AlignCenter size={TOOL_ICON_SIZE} />
              <Tooltip>Center</Tooltip>
            </Toggle>
            <Toggle
              data-inherit={root.textAlign === 'right'}
              bind={styleWriter}
              name="textAlign"
              value="right"
              className="toggle-btn">
              <AlignRight size={TOOL_ICON_SIZE} />
              <Tooltip>Right</Tooltip>
            </Toggle>
            <Toggle
              data-inherit={root.textAlign === 'justify'}
              bind={styleWriter}
              name="textAlign"
              value="justify"
              className="toggle-btn">
              <AlignJustify size={TOOL_ICON_SIZE} />
              <Tooltip>Justify</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
        <PanelColumn label="Color">
          <ColorPicker
            className="toggle-btn cursor-pointer"
            bind={styleWriter}
            name="color"
            placeholder={`${node.style.color ?? root.color ?? '#000000'}`}>
            <Type size={TOOL_ICON_SIZE} />
            <Tooltip>Text Color</Tooltip>
          </ColorPicker>
        </PanelColumn>
      </PanelRow>

      <PanelRow>
        <PanelColumn label="Text transform">
          <ToggleGroup>
            <Toggle
              data-inherit={root.textTransform === 'lowercase'}
              bind={styleWriter}
              name="textTransform"
              value="lowercase"
              className="toggle-btn">
              <CaseLower size={TOOL_ICON_SIZE} />
              <Tooltip>lowercase</Tooltip>
            </Toggle>
            <Toggle
              data-inherit={root.textTransform === 'capitalize'}
              bind={styleWriter}
              name="textTransform"
              value="capitalize"
              className="toggle-btn">
              <CaseSensitive size={TOOL_ICON_SIZE} />
              <Tooltip>Titlecase</Tooltip>
            </Toggle>
            <Toggle
              data-inherit={root.textTransform === 'uppercase'}
              bind={styleWriter}
              name="textTransform"
              value="uppercase"
              className="toggle-btn">
              <CaseUpper size={TOOL_ICON_SIZE} />
              <Tooltip>UPPERCASE</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
        <PanelColumn label="Decoration">
          <ToggleGroup>
            <Toggle
              data-inherit={root.textDecoration === 'line-through'}
              bind={styleWriter}
              name="textDecoration"
              value="line-through"
              className="toggle-btn">
              <Strikethrough size={TOOL_ICON_SIZE} />
              <Tooltip>Strikethrough</Tooltip>
            </Toggle>
            <Toggle
              data-inherit={root.textDecoration === 'underline'}
              bind={styleWriter}
              name="textDecoration"
              value="underline"
              className="toggle-btn">
              <Underline size={TOOL_ICON_SIZE} />
              <Tooltip>Underline</Tooltip>
            </Toggle>
            <Toggle
              data-inherit={root.textDecoration === 'dashed'}
              bind={styleWriter}
              name="textDecoration"
              value="dashed"
              className="toggle-btn">
              <PanelBottomDashed size={TOOL_ICON_SIZE} />
              <Tooltip>Dashed</Tooltip>
            </Toggle>
            <Toggle
              data-inherit={root.textDecoration === 'dotted'}
              bind={styleWriter}
              name="textDecoration"
              value="dotted"
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
