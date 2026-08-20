import type { HTMLAttributes, KeyboardEvent, ReactElement, ReactNode } from 'react';
import { type AnyType, classx, For, mutable, render, Show, setup, uIndex } from '../index.js';

const CODE_GROUP_INDEX = Symbol.for('air.mdx.codegroup');

export interface CodeGroupProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  tablistLabel?: string;
}

export const CodeGroup = setup<CodeGroupProps>((props) => {
  const $restProps = props.$omit(['children', 'className', 'id', 'tablistLabel']);
  const state = mutable({ activeIndex: 0 });
  const groupId = props.id ?? `cg-${uIndex(CODE_GROUP_INDEX)}`;

  const nodes = (Array.isArray(props.children) ? props.children : [props.children]).filter(
    (c): c is ReactElement => typeof c === 'object' && c !== null && 'props' in c
  );

  const tabs = nodes.map((node, i) => {
    const code = findCode([node])[0];
    const dataTitle = (code?.props as AnyType)?.['data-title'];
    const dataLang = (code?.props as AnyType)?.['data-language'];
    return {
      id: i,
      name: dataTitle || dataLang || `Tab ${i + 1}`,
    };
  });

  const activateTab = (index: number) => {
    state.activeIndex = index;
    // Move focus to keep it in sync with the roving tabindex (WAI-ARIA tabs pattern).
    document.getElementById(`tab-${groupId}-${index}`)?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      activateTab((index + 1) % tabs.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      activateTab((index - 1 + tabs.length) % tabs.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      activateTab(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      activateTab(tabs.length - 1);
    }
  };

  return render(
    () => (
      <div {...$restProps} className={classx('air-mdx-codegroup', props.className)}>
        <div className="air-mdx-codegroup-tabs" role="tablist" aria-label={props.tablistLabel ?? 'Code examples'}>
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
