import { Input } from '@anchorlib/react-classic/components';
import { useObserver, useWriter } from '@anchorlib/react-classic';
import { editorApp } from '@lib/editor.js';
import { PanelColumn } from '../../PanelColumn.js';
import { PanelRow } from '../../PanelRow.js';
import { Tooltip } from '../../Tooltip.js';

export default function EditorRadiusPanel() {
  const base = editorApp.current.style === editorApp.currentStyle ? {} : editorApp.current.style;
  const style = useObserver(() => editorApp.currentStyle);
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
        <PanelColumn label="Border radius">
          <div className="flex items-stretch gap-4">
            <div className="inputs flex-1 flex flex-col justify-between">
              <label className="cols-1">
                <Input
                  type={'number'}
                  bind={styleWriter}
                  name={'borderTopLeftRadius'}
                  inherits={[base]}
                  className={'anchor-input tool-input text-center'}
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
                  name={'borderBottomLeftRadius'}
                  inherits={[base]}
                  className={'anchor-input tool-input text-center'}
                  placeholder="0"
                  min={0}
                  onChange={(e) => handleSync('bottom-left', e.target.value)}
                />
                <Tooltip>Bottom Left</Tooltip>
              </label>
            </div>
            <div className="preview w-[96px] rounded-lg aspect-square border border-slate-800 flex items-center justify-center p-4">
              <label className="cols-1">
                <Input
                  type={'number'}
                  bind={styleWriter}
                  name={'borderRadius'}
                  inherits={[base]}
                  className={'anchor-input tool-input text-center'}
                  placeholder="0"
                  onChange={handleAll}
                />
                <Tooltip>All</Tooltip>
              </label>
            </div>
            <div className="inputs flex-1 flex flex-col justify-between">
              <label className="cols-1">
                <Input
                  type={'number'}
                  bind={styleWriter}
                  name={'borderTopRightRadius'}
                  inherits={[base]}
                  className={'anchor-input tool-input text-center'}
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
                  name={'borderBottomRightRadius'}
                  inherits={[base]}
                  className={'anchor-input tool-input text-center'}
                  placeholder="0"
                  min={0}
                  onChange={(e) => handleSync('bottom-right', e.target.value)}
                />
                <Tooltip>Bottom Right</Tooltip>
              </label>
            </div>
          </div>
        </PanelColumn>
      </PanelRow>
    </>
  );
}
