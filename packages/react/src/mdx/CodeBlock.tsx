import type { HTMLAttributes, JSX, ReactNode } from 'react';
import { type AnyType, classx, Show, template } from '../index.js';
import { CodeCopy } from './CodeCopy.js';

export interface CodeBlockProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  hideCopy?: boolean;
}

export const CodeBlock = template<CodeBlockProps>(({ children, className, hideCopy, ...restProps }) => {
  const { lang, title } = getTitle(children as JSX.Element) ?? {};
  return (
    <div {...restProps} className={classx('air-mdx-code-block-wrapper', className)}>
      {(title || lang) && (
        <div className="air-mdx-code-block-title">
          {title && <span>{title}</span>}
          {lang && <span>{lang.toUpperCase()}</span>}
        </div>
      )}
      <Show when={() => !hideCopy}>{() => <CodeCopy />}</Show>
      {children}
    </div>
  );
}, 'CodeBlock');

function getTitle(node: JSX.Element): { lang: string; title: string } | undefined {
  if (Array.isArray(node)) {
    return node.find((child) => getTitle(child));
  }

  if (node) {
    if (node?.type === 'code') {
      const lang = (node.props as AnyType)?.['data-language'];
      const title = (node.props as AnyType)?.['data-title'];
      return { lang, title };
    }

    if (node?.props?.children) {
      return getTitle(node.props.children);
    }
  }
}
