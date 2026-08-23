import type { AnyType } from '@airlib/core';
import { classx } from '@airlib/core';
import { type JSX, splitProps } from '../solid.js';
import { Show } from '../switch.js';
import { CodeCopy } from './CodeCopy.js';

export interface CodeBlockProps extends JSX.HTMLAttributes<HTMLDivElement> {
  children?: JSX.Element;
  hideCopy?: boolean;
}

export function CodeBlock(allProps: CodeBlockProps): JSX.Element {
  const [props, restProps] = splitProps(allProps, ['children', 'class', 'hideCopy']);
  const meta = () => getTitle(props.children);

  return (
    <div {...restProps} class={classx('air-mdx-code-block-wrapper', props.class)}>
      <Show when={meta()?.title || meta()?.lang}>
        <div class="air-mdx-code-block-title">
          <Show when={meta()?.title}>
            <span>{meta()?.title}</span>
          </Show>
          <Show when={meta()?.lang}>
            <span>{meta()?.lang?.toUpperCase()}</span>
          </Show>
        </div>
      </Show>
      <Show when={!props.hideCopy}>
        <CodeCopy />
      </Show>
      {props.children}
    </div>
  );
}

function getTitle(node: unknown): { lang?: string; title?: string } | undefined {
  if (!node) return undefined;

  if (Array.isArray(node)) {
    for (const child of node) {
      const match = getTitle(child);
      if (match) return match;
    }
    return undefined;
  }

  if (typeof node === 'object') {
    if (typeof (node as Element).getAttribute === 'function') {
      const el = node as Element;
      const codeEl = el.tagName?.toLowerCase() === 'code' ? el : el.querySelector?.('code');
      if (codeEl) {
        const lang = codeEl.getAttribute('data-language') ?? undefined;
        const title = codeEl.getAttribute('data-title') ?? undefined;
        return { lang, title };
      }
    }

    const obj = node as Record<string, AnyType>;
    if (obj.type === 'code' || obj.name === 'code') {
      const lang = obj.props?.['data-language'] ?? obj['data-language'];
      const title = obj.props?.['data-title'] ?? obj['data-title'];
      return { lang, title };
    }

    if (obj.props?.children) {
      return getTitle(obj.props.children);
    }
    if (obj.children) {
      return getTitle(obj.children);
    }
  }

  return undefined;
}
