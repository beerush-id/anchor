import { Tooltip } from '../../Tooltip.js';
import { Input } from '@anchorlib/react-classic/components';
import { useObserver, useWriter } from '@anchorlib/react-classic';
import { editorApp } from '@lib/editor.js';
import { PanelColumn } from '../../PanelColumn.js';
import { PanelRow } from '../../PanelRow.js';

export default function EditorDimensionPanel() {
  const base = editorApp.current.style === editorApp.currentStyle ? {} : editorApp.current.style;
  const style = useObserver(() => editorApp.currentStyle);
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
            inherits={[base]}
            className={'anchor-input tool-input'}
            placeholder="auto"
          />
        </PanelColumn>
        <PanelColumn label="Height">
          <Input
            type={'number'}
            bind={styleWriter}
            name={'height'}
            inherits={[base]}
            className={'anchor-input tool-input'}
            placeholder="auto"
          />
        </PanelColumn>
        <PanelColumn label="Margin">
          <Input
            type={'number'}
            bind={styleWriter}
            name={'margin'}
            inherits={[base]}
            className={'anchor-input tool-input'}
            placeholder="auto"
            onChange={() => {
              delete styleWriter.marginBlock;
              delete styleWriter.marginInline;
            }}
          />
        </PanelColumn>
        <PanelColumn label="Padding">
          <Input
            type={'number'}
            bind={styleWriter}
            name={'padding'}
            inherits={[base]}
            className={'anchor-input tool-input'}
            placeholder="auto"
            onChange={() => {
              delete styleWriter.paddingBlock;
              delete styleWriter.paddingInline;
            }}
          />
        </PanelColumn>
      </PanelRow>

      <PanelRow>
        <PanelColumn label="Margin">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label>
              <Input
                type={'number'}
                bind={styleWriter}
                name={'marginBlock'}
                inherits={[base]}
                className={'anchor-input tool-input cols-1'}
                placeholder="Block"
                onChange={() => {
                  delete styleWriter.margin;
                }}
              />
              <Tooltip>Margin Block</Tooltip>
            </label>
            <label>
              <Input
                type={'number'}
                bind={styleWriter}
                name={'marginInline'}
                inherits={[base]}
                className={'anchor-input tool-input cols-1'}
                placeholder="Inline"
                onChange={() => {
                  delete styleWriter.margin;
                }}
              />
              <Tooltip>Margin Inline</Tooltip>
            </label>
          </div>
        </PanelColumn>
        <PanelColumn label="Padding">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <label>
              <Input
                type={'number'}
                bind={styleWriter}
                name={'paddingBlock'}
                inherits={[base]}
                className={'anchor-input tool-input cols-1'}
                placeholder="Block"
                onChange={() => {
                  delete styleWriter.padding;
                }}
              />
              <Tooltip>Padding Block</Tooltip>
            </label>
            <label>
              <Input
                type={'number'}
                bind={styleWriter}
                name={'paddingInline'}
                inherits={[base]}
                className={'anchor-input tool-input cols-1'}
                placeholder="Inline"
                onChange={() => {
                  delete styleWriter.padding;
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
