import type { HTMLAttributes, KeyboardEvent, ReactElement, ReactNode } from 'react';
import { type AnyType, classx, For, mutable, render, Show, setup, uIndex } from '../index.js';
import { CodeCopy } from './CodeCopy.js';

const CODE_GROUP_INDEX = Symbol.for('air.mdx.codegroup');

export interface CodeGroupProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const CodeGroup = setup<CodeGroupProps>((props) => {
  const $restProps = props.$omit(['children', 'className', 'id']);
  const state = mutable({ activeIndex: 0 });
  const groupId = props.id ?? `cg-${uIndex(CODE_GROUP_INDEX)}`;

  const nodes = (Array.isArray(props.children) ? props.children : [props.children]).filter(
    (c): c is ReactElement => typeof c === 'object' && c !== null && 'props' in c
  );

  const codeNodes = findCode(nodes);
  const tabs = nodes.map((_, i) => {
    const code = codeNodes[i];
    const dataTitle = (code?.props as AnyType)?.['data-title'];
    const dataLang = (code?.props as AnyType)?.['data-language'];
    return {
      id: i,
      name: dataTitle || dataLang || `Tab ${i + 1}`,
    };
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      state.activeIndex = (index + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      state.activeIndex = (index - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      state.activeIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      state.activeIndex = tabs.length - 1;
    }
  };

  const getActiveText = (): string => {
    const activeNode = nodes[state.activeIndex];
    return activeNode ? extractText(activeNode) : '';
  };

  return render(
    () => (
      <div {...$restProps} className={classx('air-mdx-codegroup', props.className)}>
        <div className="air-mdx-codegroup-tabs" role="tablist" aria-label="Code examples">
          <For each={() => tabs}>
            {(tab) => (
              <button
                role="tab"
                id={`tab-${groupId}-${tab.id}`}
                aria-selected={state.activeIndex === tab.id}
                aria-controls={`panel-${groupId}-${tab.id}`}
                tabIndex={state.activeIndex === tab.id ? 0 : -1}
                className={classx('air-mdx-codegroup-tab', { active: state.activeIndex === tab.id })}
                onClick={() => {
                  state.activeIndex = tab.id;
                }}
                onKeyDown={(e) => handleKeyDown(e, tab.id)}
              >
                {tab.name}
              </button>
            )}
          </For>
        </div>
        <div
          role="tabpanel"
          id={`panel-${groupId}-${state.activeIndex}`}
          aria-labelledby={`tab-${groupId}-${state.activeIndex}`}
          className="air-mdx-codegroup-content"
        >
          <CodeCopy getText={getActiveText} />
          <For each={() => nodes}>{(node, i) => <Show when={() => state.activeIndex === i}>{() => node}</Show>}</For>
        </div>
      </div>
    ),
    'CodeGroup'
  );
}, 'CodeGroup');

function findCode(nodes: ReactElement[]): ReactElement[] {
  const codes: ReactElement[] = [];

  nodes.forEach((n: AnyType) => {
    if (n?.type === 'code') {
      codes.push(n);
    } else if (n?.props?.children) {
      codes.push(...findCode(Array.isArray(n.props.children) ? n.props.children : [n.props.children]));
    }
  });

  return codes;
}

function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (!node || typeof node !== 'object') {
    return '';
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }
  if ('props' in node && (node.props as AnyType)?.children) {
    return extractText((node.props as AnyType).children);
  }
  return '';
}
