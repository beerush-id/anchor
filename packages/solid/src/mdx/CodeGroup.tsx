import { $symbol, type AnyType, classx, effect, mutable, uIndex, untrack } from '@airlib/core';
import { setup } from '../hoc.js';
import { For, type JSX, onMount } from '../solid.js';
import { Show } from '../switch.js';
import { mdxCtx } from './context.js';

/**
 * IMPORTANT: THE SYMBOL IS SHARED WITH JSX GENERATOR ON THE MARKDOWN MODULE!
 */
export const CODE_GROUP_INDEX = $symbol('air.mdx.codegroup');

export interface CodeGroupProps extends JSX.HTMLAttributes<HTMLDivElement> {
  title?: string;
  group?: string;
  children?: JSX.Element;
  tablistLabel?: string;
}

export interface CodeTab {
  id: number;
  node: JSX.Element;
  name: string;
  title: string;
}

export const CodeGroup = setup<CodeGroupProps>((props) => {
  const $restProps = props.$omit(['title', 'group', 'children', 'class', 'id', 'tablistLabel']);
  const state = mutable({ activeIndex: 0 });
  const fallbackId = `cg-${uIndex(CODE_GROUP_INDEX, true)}`;
  const groupId = () => props.id ?? fallbackId;

  const nodes = () => {
    const raw = props.children;
    return (Array.isArray(raw) ? raw : [raw]).filter(Boolean);
  };

  const tabs = () => {
    const list = nodes();
    return list.map((node, i) => {
      const code = findCode([node])[0];
      const cProps = ((code as AnyType)?.props ?? (code as AnyType) ?? {}) as AnyType;
      const dataTitle = cProps?.['data-title'] ?? (code as Element)?.getAttribute?.('data-title');
      const dataLang = cProps?.['data-language'] ?? (code as Element)?.getAttribute?.('data-language');
      const name = cProps?.name ?? (code as Element)?.getAttribute?.('name');
      const title = dataTitle || dataLang || `Tab ${i + 1}`;

      return {
        id: i,
        node,
        name: name || title.toLowerCase(),
        title,
      } as CodeTab;
    });
  };

  const ctx = mdxCtx.get();
  if (ctx) {
    effect(() => {
      const group = props.group;
      const firstTab = tabs()[0]?.name;
      if (!group || !firstTab) return;

      untrack(() => {
        if (!ctx.store[group]) {
          ctx.store[group] = firstTab;
        }
      });
    });
  }

  const activateTab = (tab: CodeTab) => {
    if (ctx && props.group) {
      ctx.store[props.group] = tab.name;
    } else {
      state.activeIndex = tab.id;
    }
    document.getElementById(`tab-${groupId()}-${tab.id}`)?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent, tab: CodeTab) => {
    const tabList = tabs();
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      activateTab(tabList[(tab.id + 1) % tabList.length]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      activateTab(tabList[(tab.id - 1 + tabList.length) % tabList.length]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      activateTab(tabList[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      activateTab(tabList[tabList.length - 1]);
    }
  };

  const isActive = (tab: CodeTab) => {
    if (ctx && props.group) {
      return ctx.store[props.group] === tab.name;
    }
    return state.activeIndex === tab.id;
  };

  let ref: HTMLDivElement | null = null;
  onMount(() => {
    /* istanbul ignore next */
    if (!ref) return;
    ref.style.setProperty('--air-mdx-group-height', `${ref.offsetHeight}px`);
  });

  return () => (
    <div
      {...$restProps}
      ref={(el) => {
        ref = el;
      }}
      class={classx('air-mdx-codegroup', props.class)}
    >
      <div class="air-mdx-codegroup-header">
        <div class="air-mdx-codegroup-tabs" role="tablist" aria-label={props.tablistLabel ?? 'Code examples'}>
          <For each={tabs()}>
            {(tab) => (
              <button
                type="button"
                role="tab"
                id={`tab-${groupId()}-${tab.id}`}
                aria-selected={isActive(tab)}
                aria-controls={`panel-${groupId()}-${tab.id}`}
                tabIndex={isActive(tab) ? 0 : -1}
                class={classx('air-mdx-codegroup-tab', { active: isActive(tab) })}
                onClick={() => activateTab(tab)}
                onKeyDown={(e) => handleKeyDown(e, tab)}
              >
                {tab.title}
              </button>
            )}
          </For>
        </div>
        <Show when={props.title}>
          <strong class="air-mdx-codegroup-title">{props.title}</strong>
        </Show>
      </div>
      <div
        role="tabpanel"
        id={`panel-${groupId()}-${state.activeIndex}`}
        aria-labelledby={`tab-${groupId()}-${state.activeIndex}`}
        class="air-mdx-codegroup-content"
      >
        <For each={tabs()}>{(tab) => <Show when={isActive(tab)}>{tab.node}</Show>}</For>
      </div>
    </div>
  );
}, 'CodeGroup');

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
