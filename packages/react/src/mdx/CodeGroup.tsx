import type { ReactElement, ReactNode } from 'react';
import { type AnyType, For, mutable, Show, setup } from '../index.js';
import { CodeCopy } from './CodeCopy.js';

export interface CodeGroupProps {
  children?: ReactNode;
}

export const CodeGroup = setup<CodeGroupProps>((props) => {
  const state = mutable({ activeIndex: 0 });

  const nodes = (Array.isArray(props.children) ? props.children : [props.children]).filter(
    (c): c is ReactElement => typeof c === 'object' && c !== null && 'props' in c
  );
  const buttons = findCode(nodes).map((c, i) => ({
    id: i,
    name: (c.props as AnyType)?.['data-title'],
  }));

  return (
    <div className="air-mdx-codegroup">
      <div className="air-mdx-codegroup-tabs" role="tablist">
        <For each={() => buttons}>
          {(tab) => (
            <button
              role="tab"
              aria-selected={state.activeIndex === tab.id}
              className={`air-mdx-codegroup-tab ${state.activeIndex === tab.id ? 'active' : ''}`}
              onClick={() => {
                state.activeIndex = tab.id;
              }}
            >
              {tab.name}
            </button>
          )}
        </For>
      </div>
      <div className="air-mdx-codegroup-content" role="tabpanel">
        <CodeCopy />
        <For each={() => nodes}>{(node, i) => <Show when={() => state.activeIndex === i} children={node} />}</For>
      </div>
    </div>
  );
}, 'CodeGroup');

function findCode(nodes: ReactElement[]) {
  const codes: ReactElement[] = [];

  nodes.forEach((n: AnyType) => {
    if (n.type === 'code') {
      codes.push(n);
    } else if (n.props?.children) {
      codes.push(...findCode(Array.isArray(n.props.children) ? n.props.children : [n.props.children]));
    }
  });

  return codes;
}
