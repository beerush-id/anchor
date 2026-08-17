import type { HTMLAttributes, ReactNode } from 'react';
import { classx, Show, template } from '../index.js';
import { CodeCopy } from './CodeCopy.js';

export interface CodeBlockProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  hideCopy?: boolean;
}

export const CodeBlock = template<CodeBlockProps>(
  ({ children, className, hideCopy, ...restProps }) => (
    <div {...restProps} className={classx('air-mdx-code-block-wrapper', className)}>
      <Show when={() => !hideCopy}>{() => <CodeCopy />}</Show>
      {children}
    </div>
  ),
  'CodeBlock'
);
