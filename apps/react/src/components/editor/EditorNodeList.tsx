import { debugRender, useObserved, useValueIs } from '@anchorlib/react';
import { type CssNode, editorApp, editorWriter, parseAllCss, type StyleVariant } from '@lib/editor.js';
import { type FC, useRef } from 'react';
import { type Immutable } from '@anchorlib/core';

export default function EditorNodeList() {
  const ref = useRef<HTMLDivElement>(null);
  debugRender(ref);

  const nodes = useObserved(() => editorApp.nodes);

  return (
    <div className="border-r border-r-slate-800 min-w-[150px] overflow-x-hidden overflow-y-auto">
      <ul className="node-list">
        {nodes.map((node) => (
          <NodeItem key={node.id} node={node} />
        ))}
      </ul>
    </div>
  );
}

const NodeItem: FC<{ node: CssNode | Immutable<CssNode> }> = ({ node }) => {
  const ref = useRef<HTMLLIElement>(null);
  debugRender(ref);

  const { label, selector } = useObserved(() => ({ label: node.label, selector: node.selector }));
  const active = useValueIs(editorApp, 'current', node);

  const handleSelect = () => {
    editorWriter.current = node;
    editorWriter.currentStyle = node.style;
    editorWriter.currentCssContent = parseAllCss();
  };

  return (
    <li ref={ref} className={`node-item w-full`}>
      <button
        onClick={handleSelect}
        className={`w-full text-left px-3 py-2 text-sm font-semibold flex items-center text-slate-300 gap-4 border-l-4 hover:border-l-brand-orange transition-all ${active ? 'border-l-brand-orange' : 'border-l-transparent'}`}>
        <span className="flex-1">{label}</span>
        <code className="inline-code">{selector}</code>
      </button>
      {active && (
        <ul className="flex flex-col w-full">
          <li className="style-variant w-full">
            <NodeVariant node={node} />
          </li>
          {node.stateStyles.map((variant) => (
            <li key={variant.selector} className="style-variant w-full">
              <NodeVariant node={node} variant={variant} />
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

const NodeVariant: FC<{ node: CssNode | Immutable<CssNode>; variant?: StyleVariant }> = ({ node, variant }) => {
  const ref = useRef<HTMLButtonElement>(null);
  debugRender(ref);

  const active = useValueIs(editorApp, 'currentStyle', variant?.style ?? node.style);
  const isEmpty = !Object.keys(variant?.style ?? node.style).length;

  const handleSelectVariant = (variant?: StyleVariant) => {
    if (!variant) {
      editorWriter.currentStyle = node.style;
      return;
    }

    editorWriter.currentStyle = variant.style;
  };

  return (
    <button
      ref={ref}
      className={`w-full pl-4 py-1 pr-2 flex items-center text-xs font-mono font-semibold text-slate-300 hover:bg-slate-700 border-l-4 ${active ? 'bg-slate-800 border-l-brand-orange/50' : 'border-l-brand-orange/25'}`}
      onClick={() => handleSelectVariant(variant)}>
      <code className="inline-code">{variant?.selector || 'NORMAL'}</code>
      <span className="flex-1"></span>
      {!isEmpty && <span className="bg-brand-orange w-2 h-2 rounded-full"></span>}
    </button>
  );
};
