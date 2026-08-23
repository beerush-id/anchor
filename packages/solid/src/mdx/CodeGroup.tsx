import { $symbol, type AnyType, classx, mutable, uIndex } from '@airlib/core';
import { For, type JSX, splitProps } from '../solid.js';
import { Show } from '../switch.js';

const CODE_GROUP_INDEX = $symbol('air.mdx.codegroup');

export interface CodeGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
  tablistLabel?: string;
}

export function CodeGroup(allProps: CodeGroupProps): JSX.Element {
  const [props, restProps] = splitProps(allProps, ['children', 'class', 'id', 'tablistLabel']);
  const state = mutable({ activeIndex: 0 });
  const groupId = props.id ?? `cg-${uIndex(CODE_GROUP_INDEX)}`;

  const nodes = () => {
    const raw = props.children;
    return (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
  };

  const tabs = () =>
    nodes().map((node, i) => {
      const code = findCode([node])[0];
      const dataTitle =
        (code as AnyType)?.props?.['data-title'] ??
        (code as AnyType)?.['data-title'] ??
        (code as Element)?.getAttribute?.('data-title');
      const dataLang =
        (code as AnyType)?.props?.['data-language'] ??
        (code as AnyType)?.['data-language'] ??
        (code as Element)?.getAttribute?.('data-language');
      return {
        id: i,
        name: dataTitle || dataLang || `Tab ${i + 1}`,
      };
    });

  const activateTab = (index: number) => {
    state.activeIndex = index;
    document.getElementById(`tab-${groupId}-${index}`)?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent, index: number) => {
    const tabList = tabs();
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      activateTab((index + 1) % tabList.length);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      activateTab((index - 1 + tabList.length) % tabList.length);
    } else if (e.key === 'Home') {
      e.preventDefault();
      activateTab(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      activateTab(tabList.length - 1);
    }
  };

  return (
    <div {...restProps} class={classx('air-mdx-codegroup', props.class)}>
      <div class="air-mdx-codegroup-tabs" role="tablist" aria-label={props.tablistLabel ?? 'Code examples'}>
        <For each={tabs()}>
          {(tab) => (
            <button
              type="button"
              role="tab"
              id={`tab-${groupId}-${tab.id}`}
              aria-selected={state.activeIndex === tab.id}
              aria-controls={`panel-${groupId}-${tab.id}`}
              tabIndex={state.activeIndex === tab.id ? 0 : -1}
              class={classx('air-mdx-codegroup-tab', { active: state.activeIndex === tab.id })}
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
        class="air-mdx-codegroup-content"
      >
        <For each={nodes()}>{(node, i) => <Show when={state.activeIndex === i()}>{node}</Show>}</For>
      </div>
    </div>
  );
}

function findCode(nodes: unknown[]): unknown[] {
  const codes: unknown[] = [];

  nodes.forEach((n: AnyType) => {
    if (!n) return;
    if (typeof n === 'object') {
      if (typeof n.getAttribute === 'function') {
        if (n.tagName?.toLowerCase() === 'code') {
          codes.push(n);
        } else {
          const inner = n.querySelector?.('code');
          if (inner) codes.push(inner);
        }
        return;
      }

      if (n.type === 'code' || n.name === 'code') {
        codes.push(n);
      } else if (n.props?.children) {
        codes.push(...findCode(Array.isArray(n.props.children) ? n.props.children : [n.props.children]));
      } else if (n.children) {
        codes.push(...findCode(Array.isArray(n.children) ? n.children : [n.children]));
      }
    }
  });

  return codes;
}
