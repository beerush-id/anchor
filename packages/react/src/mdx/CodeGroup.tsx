import type { HTMLAttributes, KeyboardEvent, ReactElement, ReactNode } from 'react';
import { type AnyType, classx, For, mutable, render, setup, Show, uIndex } from '../index.js';
import { mdxCtx } from './context.ts';

/**
 * IMPORTANT: THE SYMBOL IS SHARED WITH JSX GENERATOR ON THE MARKDOWN MODULE!
 */
export const CODE_GROUP_INDEX = Symbol.for('air.mdx.codegroup');

export interface CodeGroupProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
  group?: string;
  children?: ReactNode;
  tablistLabel?: string;
}

export interface CodeTab {
  id: number;
  code: ReactElement;
  name: string;
  title: string;
}

export const CodeGroup = setup<CodeGroupProps>((props) => {
  const $restProps = props.$omit(['children', 'className', 'id', 'tablistLabel', 'title']);
  const state = mutable({ activeIndex: 0 });
  const groupId = props.id ?? `cg-${uIndex(CODE_GROUP_INDEX, true)}`;

  const nodes = (Array.isArray(props.children) ? props.children : [props.children])
    .filter((c): c is ReactElement => typeof c === 'object' && c !== null && 'props' in c)
    .map((n) => (n.props as AnyType).children as ReactElement<'div'>);

  const ctx = mdxCtx.get();
  const tabs = nodes.map((node, i) => {
    const cProps = (node?.props ?? {}) as AnyType;
    const dataTitle = cProps['data-title'];
    const dataLang = cProps['data-language'];
    const title = dataTitle || dataLang || `Tab ${i + 1}`;

    return {
      id: i,
      code: node,
      name: cProps.name || title.toLowerCase(),
      title,
    } as CodeTab;
  });

  if (ctx && props.group && !ctx.store[props.group]) {
    ctx.store[props.group] = tabs[0]?.name;
  }

  const activateTab = (tab: CodeTab) => {
    if (ctx && props.group) {
      ctx.store[props.group] = tab.name;
    } else {
      state.activeIndex = tab.id;
    }
    document.getElementById(`tab-${groupId}-${tab.id}`)?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, tab: CodeTab) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      activateTab(tabs[(tab.id + 1) % tabs.length]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      activateTab(tabs[(tab.id - 1 + tabs.length) % tabs.length]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      activateTab(tabs[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      activateTab(tabs[tabs.length - 1]);
    }
  };

  const isActive = (tab: CodeTab) => {
    if (ctx && props.group) {
      return ctx.store[props.group] === tab.name;
    }

    return state.activeIndex === tab.id;
  };

  return render(
    () => (
      <div {...$restProps} className={classx('air-mdx-codegroup', props.className)}>
        <div className="air-mdx-codegroup-header">
          <div className="air-mdx-codegroup-tabs" role="tablist" aria-label={props.tablistLabel ?? 'Code examples'}>
            <For each={() => tabs}>
              {(tab) => (
                <button
                  role="tab"
                  id={`tab-${groupId}-${tab.id}`}
                  aria-selected={isActive(tab)}
                  aria-controls={`panel-${groupId}-${tab.id}`}
                  tabIndex={state.activeIndex === tab.id ? 0 : -1}
                  className={classx('air-mdx-codegroup-tab', { active: isActive(tab) })}
                  onClick={() => activateTab(tab)}
                  onKeyDown={(e) => handleKeyDown(e, tab)}
                >
                  {tab.title}
                </button>
              )}
            </For>
          </div>
          <Show when={props.title}>
            <strong className="air-mdx-codegroup-title">{props.title}</strong>
          </Show>
        </div>
        <div
          role="tabpanel"
          id={`panel-${groupId}-${state.activeIndex}`}
          aria-labelledby={`tab-${groupId}-${state.activeIndex}`}
          className="air-mdx-codegroup-content"
        >
          <For each={() => tabs}>{(tab) => <Show when={() => isActive(tab)}>{() => tab.code}</Show>}</For>
        </div>
      </div>
    ),
    'CodeGroup'
  );
}, 'CodeGroup');
