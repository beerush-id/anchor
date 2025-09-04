import { Input } from '@anchor/react/components';
import { useObserved, useWriter } from '@anchor/react';
import { editorApp } from '@lib/editor.js';
import { PanelColumn } from '../../PanelColumn.js';
import { PanelRow } from '../../PanelRow.js';
import { Tooltip } from '../../Tooltip.js';

export default function EditorRadiusPanel() {
  const style = useObserved(() => editorApp.currentStyle);
  const styleWriter = useWriter(style, [
    'borderRadius',
    'borderTopLeftRadius',
    'borderTopRightRadius',
    'borderBottomLeftRadius',
    'borderBottomRightRadius',
  ]);

  const handleAll = () => {
    if (styleWriter.borderTopLeftRadius) {
      styleWriter.borderTopLeftRadius = '';
    }
    if (styleWriter.borderTopRightRadius) {
      styleWriter.borderTopRightRadius = '';
    }
    if (styleWriter.borderBottomLeftRadius) {
      styleWriter.borderBottomLeftRadius = '';
    }
    if (styleWriter.borderBottomRightRadius) {
      styleWriter.borderBottomRightRadius = '';
    }
  };

  const handleSync = (corner: string, value: string) => {
    const radius = style.borderRadius;
    const numValue = parseFloat(value);

    styleWriter.borderRadius = '';

    const updateRadius = (cornerName: string, currentValue?: string | number) => {
      return corner === cornerName ? numValue : currentValue || radius;
    };

    styleWriter.borderTopLeftRadius = updateRadius('top-left', styleWriter.borderTopLeftRadius);
    styleWriter.borderTopRightRadius = updateRadius('top-right', styleWriter.borderTopRightRadius);
    styleWriter.borderBottomLeftRadius = updateRadius('bottom-left', styleWriter.borderBottomLeftRadius);
    styleWriter.borderBottomRightRadius = updateRadius('bottom-right', styleWriter.borderBottomRightRadius);
  };

  return (
    <>
      <PanelRow>
        <PanelColumn label="Rounded">
          <div className="grid grid-cols-5 gap-2">
            <label className="cols-1">
              <Input
                type={'number'}
                bind={styleWriter}
                name={'borderRadius'}
                className={'anchor-input tool-input'}
                placeholder="0"
                onChange={handleAll}
              />
              <Tooltip>All</Tooltip>
            </label>
            <label className="cols-1">
              <Input
                type={'number'}
                bind={styleWriter}
                name={'borderTopLeftRadius'}
                className={'anchor-input tool-input'}
                placeholder="0"
                min={0}
                onChange={(e) => handleSync('top-left', e.target.value)}
              />
              <Tooltip>Top Left</Tooltip>
            </label>
            <label className="cols-1">
              <Input
                type={'number'}
                bind={styleWriter}
                name={'borderTopRightRadius'}
                className={'anchor-input tool-input'}
                placeholder="0"
                min={0}
                onChange={(e) => handleSync('top-right', e.target.value)}
              />
              <Tooltip>Top Right</Tooltip>
            </label>
            <label className="cols-1">
              <Input
                type={'number'}
                bind={styleWriter}
                name={'borderBottomLeftRadius'}
                className={'anchor-input tool-input'}
                placeholder="0"
                min={0}
                onChange={(e) => handleSync('bottom-left', e.target.value)}
              />
              <Tooltip>Bottom Left</Tooltip>
            </label>
            <label className="cols-1">
              <Input
                type={'number'}
                bind={styleWriter}
                name={'borderBottomRightRadius'}
                className={'anchor-input tool-input'}
                placeholder="0"
                min={0}
                onChange={(e) => handleSync('bottom-right', e.target.value)}
              />
              <Tooltip>Bottom Right</Tooltip>
            </label>
          </div>
        </PanelColumn>
      </PanelRow>
    </>
  );
}
