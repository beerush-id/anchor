import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  CaseLower,
  CaseSensitive,
  CaseUpper,
  ChevronDown,
  GalleryThumbnails,
  Italic,
  RemoveFormatting,
  SpellCheck2,
  Strikethrough,
  TextCursor,
  Type,
  Underline,
} from 'lucide-react';
import { PanelColumn, PanelRow, Tooltip } from '@anchorlib/react-kit/components';
import { ColorPicker, Input, Select, Toggle, ToggleGroup } from '@anchorlib/react/components';
import { useObserver, useWriter } from '@anchorlib/react';
import { editorApp, TOOL_ICON_SIZE } from '@utils/editor';

export default function EditorTextPanel() {
  const root = editorApp.rootStyle;
  const base = editorApp.current.style === editorApp.currentStyle ? {} : editorApp.current.style;
  const style = useObserver(() => editorApp.currentStyle);
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
          <label className="relative">
            <Select bind={styleWriter} name="fontFamily" className="ark-input tool-input pr-4">
              <option value="inherit">Default</option>
              <option value="Arial">Arial</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Courier New">Courier New</option>
              <option value="Verdana">Verdana</option>
            </Select>
            <ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2" />
          </label>
        </PanelColumn>
        <PanelColumn className="flex-1" label="Size">
          <Input
            type={'number'}
            bind={styleWriter}
            name={'fontSize'}
            inherits={[base, root]}
            className={'ark-input tool-input cols-1'}
            placeholder="default"
          />
        </PanelColumn>
        <PanelColumn label="Color">
          <ColorPicker
            bind={styleWriter}
            name="color"
            inherits={[base, root]}
            className="ark-toggle-button cursor-pointer"
          >
            <Type size={TOOL_ICON_SIZE} />
            <Tooltip>Text Color</Tooltip>
          </ColorPicker>
        </PanelColumn>
      </PanelRow>

      <PanelRow>
        <PanelColumn label="Font style">
          <ToggleGroup>
            <Toggle
              bind={styleWriter}
              name="fontWeight"
              value="normal"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <Type size={TOOL_ICON_SIZE} />
              <Tooltip>Normal</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="fontWeight"
              value="500"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <Bold size={TOOL_ICON_SIZE} />
              <Tooltip>Bold</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="fontWeight"
              value="200"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <TextCursor size={TOOL_ICON_SIZE} />
              <Tooltip>Thin</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="fontStyle"
              value="italic"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
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
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <AlignLeft size={TOOL_ICON_SIZE} />
              <Tooltip>Left</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textAlign"
              value="center"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <AlignCenter size={TOOL_ICON_SIZE} />
              <Tooltip>Center</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textAlign"
              value="right"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <AlignRight size={TOOL_ICON_SIZE} />
              <Tooltip>Right</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textAlign"
              value="justify"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <AlignJustify size={TOOL_ICON_SIZE} />
              <Tooltip>Justify</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
      </PanelRow>

      <PanelRow>
        <PanelColumn label="Text transform">
          <ToggleGroup>
            <Toggle
              bind={styleWriter}
              name="textTransform"
              value="lowercase"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <CaseLower size={TOOL_ICON_SIZE} />
              <Tooltip>lowercase</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textTransform"
              value="capitalize"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <CaseSensitive size={TOOL_ICON_SIZE} />
              <Tooltip>Titlecase</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textTransform"
              value="uppercase"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <CaseUpper size={TOOL_ICON_SIZE} />
              <Tooltip>UPPERCASE</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textTransform"
              value="none"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <RemoveFormatting size={TOOL_ICON_SIZE} />
              <Tooltip>None</Tooltip>
            </Toggle>
          </ToggleGroup>
        </PanelColumn>
        <PanelColumn label="Decoration">
          <ToggleGroup>
            <Toggle
              bind={styleWriter}
              name="textDecoration"
              value="line-through"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <Strikethrough size={TOOL_ICON_SIZE} />
              <Tooltip>Strikethrough</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textDecoration"
              value="underline"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <Underline size={TOOL_ICON_SIZE} />
              <Tooltip>Underline</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textDecoration"
              value="dashed"
              inherits={[base, root]}
              className="ark-toggle-button"
            >
              <SpellCheck2 size={TOOL_ICON_SIZE} />
              <Tooltip>Dashed</Tooltip>
            </Toggle>
            <Toggle
              bind={styleWriter}
              name="textDecoration"
              value="dotted"
              inherits={[base, root]}
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
