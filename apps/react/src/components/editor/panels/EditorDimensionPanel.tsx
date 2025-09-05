import { Tooltip } from '../../Tooltip.js';
import { Input } from '@anchor/react/components';
import { useObserved, useWriter } from '@anchor/react';
import { editorApp } from '@lib/editor.js';
import { PanelColumn } from '../../PanelColumn.js';
import { PanelRow } from '../../PanelRow.js';

export default function EditorDimensionPanel() {
  const node = editorApp.current;
  const style = useObserved(() => editorApp.currentStyle);
  const styleWriter = useWriter(style, [
    'width',
    'height',
    'margin',
    'padding',
    'marginBlock',
    'marginInline',
    'paddingBlock',
    'paddingInline',
  ]);

  return (
    <>
      <PanelRow>
        <PanelColumn label="Width">
          <Input
            type={'number'}
            bind={styleWriter}
            name={'width'}
            inherits={[node.style]}
            className={'anchor-input tool-input'}
            placeholder="auto"
          />
        </PanelColumn>
        <PanelColumn label="Height">
          <Input
            type={'number'}
            bind={styleWriter}
            name={'height'}
            inherits={[node.style]}
            className={'anchor-input tool-input'}
            placeholder="auto"
          />
        </PanelColumn>
        <PanelColumn label="Margin">
          <Input
            type={'number'}
            bind={styleWriter}
            name={'margin'}
            inherits={[node.style]}
            className={'anchor-input tool-input'}
            placeholder="auto"
            onChange={(e) => {
              styleWriter.marginBlock = parseFloat(e.target.value);
              styleWriter.marginInline = parseFloat(e.target.value);
            }}
          />
        </PanelColumn>
        <PanelColumn label="Padding">
          <Input
            type={'number'}
            bind={styleWriter}
            name={'padding'}
            inherits={[node.style]}
            className={'anchor-input tool-input'}
            placeholder="auto"
            onChange={(e) => {
              styleWriter.paddingBlock = parseFloat(e.target.value);
              styleWriter.paddingInline = parseFloat(e.target.value);
            }}
          />
        </PanelColumn>
      </PanelRow>

      <PanelRow>
        <PanelColumn label="Margin">
          <div className="grid grid-cols-2 gap-2">
            <label>
              <Input
                type={'number'}
                bind={styleWriter}
                name={'marginBlock'}
                inherits={[node.style]}
                className={'anchor-input tool-input cols-1'}
                placeholder="Block"
                onChange={() => {
                  styleWriter.margin = '';
                }}
              />
              <Tooltip>Margin Block</Tooltip>
            </label>
            <label>
              <Input
                type={'number'}
                bind={styleWriter}
                name={'marginInline'}
                inherits={[node.style]}
                className={'anchor-input tool-input cols-1'}
                placeholder="Inline"
                onChange={() => {
                  styleWriter.margin = '';
                }}
              />
              <Tooltip>Margin Inline</Tooltip>
            </label>
          </div>
        </PanelColumn>
        <PanelColumn label="Padding">
          <div className="grid grid-cols-2 gap-2">
            <label>
              <Input
                type={'number'}
                bind={styleWriter}
                name={'paddingBlock'}
                inherits={[node.style]}
                className={'anchor-input tool-input cols-1'}
                placeholder="Block"
                onChange={() => {
                  styleWriter.padding = '';
                }}
              />
              <Tooltip>Padding Block</Tooltip>
            </label>
            <label>
              <Input
                type={'number'}
                bind={styleWriter}
                name={'paddingInline'}
                inherits={[node.style]}
                className={'anchor-input tool-input cols-1'}
                placeholder="Inline"
                onChange={() => {
                  styleWriter.padding = '';
                }}
              />
              <Tooltip>Padding Inline</Tooltip>
            </label>
          </div>
        </PanelColumn>
      </PanelRow>
    </>
  );
}
