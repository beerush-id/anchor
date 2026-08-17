import type { HTMLAttributes, ReactNode } from 'react';
import { setup, classx, render } from '../index.js';
import { CodeCopy } from './CodeCopy.js';

export interface CodeBlockProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const CodeBlock = setup<CodeBlockProps>((props) => {
  const $restProps = props.$omit(['children', 'className']);

  return render(() =>(
    <div {...$restProps} className={classx('air-mdx-code-block-wrapper', props.className)}>
      <CodeCopy />
      {props.children}
    </div>
  ), 'CodeBlock');
}, 'CodeBlock');
