import type { HTMLAttributes, KeyboardEvent, ReactElement, ReactNode } from 'react';
import {
  type AnyType,
  classx,
  derived,
  effect,
  For,
  mutable,
  onMount,
  Show,
  setup,
  uIndex,
  untrack,
} from '../index.js';
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
  const ctx = mdxCtx.get();

  const tabs = derived(() => {
    const nodes = (Array.isArray(props.children) ? props.children : [props.children])
      .filter((c): c is ReactElement => typeof c === 'object' && c !== null && 'props' in c)
      .map((n) => (n.props as AnyType).children as ReactElement<'div'>);

    return nodes.map((node, i) => {
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
  });
  const groupId = derived(() => props.id ?? `cg-${uIndex(CODE_GROUP_INDEX, true)}`);

  if (ctx) {
    effect(() => {
      const group = props.group;
      const defaultTab = tabs.value[0]?.name;
      if (!group || !defaultTab) return;

      untrack(() => {
        if (!ctx.store[group]) {
          ctx.store[group] = defaultTab;
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
    document.getElementById(`tab-${groupId.value}-${tab.id}`)?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, tab: CodeTab) => {
    const items = tabs.value;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      activateTab(items[(tab.id + 1) % items.length]);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      activateTab(items[(tab.id - 1 + items.length) % items.length]);
    } else if (e.key === 'Home') {
      e.preventDefault();
      activateTab(items[0]);
    } else if (e.key === 'End') {
      e.preventDefault();
      activateTab(items[items.length - 1]);
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
      className={classx('air-mdx-codegroup', props.className)}
    >
      <div className="air-mdx-codegroup-header">
        <div className="air-mdx-codegroup-tabs" role="tablist" aria-label={props.tablistLabel ?? 'Code examples'}>
          <For each={() => tabs.value}>
            {(tab) => (
              <button
                role="tab"
                id={`tab-${groupId.value}-${tab.id}`}
                aria-selected={isActive(tab)}
                aria-controls={`panel-${groupId.value}-${tab.id}`}
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
        <Show when={() => props.title}>
          <strong className="air-mdx-codegroup-title">{props.title}</strong>
        </Show>
      </div>
      <div
        role="tabpanel"
        id={`panel-${groupId.value}-${state.activeIndex}`}
        aria-labelledby={`tab-${groupId.value}-${state.activeIndex}`}
        className="air-mdx-codegroup-content"
      >
        <For each={() => tabs.value}>{(tab) => <Show when={() => isActive(tab)}>{() => tab.code}</Show>}</For>
      </div>
    </div>
  );
}, 'CodeGroup');
