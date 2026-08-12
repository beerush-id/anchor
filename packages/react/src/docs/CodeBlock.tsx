import type { HTMLAttributes, ReactNode, RefObject } from 'react';
import { mutable, Snippet, setup } from '../index.js';

export interface CodeBlockProps extends HTMLAttributes<HTMLPreElement> {
  children?: ReactNode;
}

export const CodeBlock = setup<CodeBlockProps>((props) => {
  const $restProps = props.$omit(['children', 'className']);

  const state = mutable({ copied: false });
  const preRef = { current: null } as RefObject<HTMLPreElement | null>;

  const handleCopy = () => {
    if (preRef.current) {
      navigator.clipboard.writeText(preRef.current.textContent || '');
      state.copied = true;
      setTimeout(() => {
        state.copied = false;
      }, 2000);
    }
  };

  return (
    <div className="air-docs-codeblock-wrapper">
      <Snippet>
        {() => (
          <button type="button" className="air-docs-copy-btn" onClick={handleCopy} aria-label="Copy code to clipboard">
            {state.copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </Snippet>
      <Snippet>
        {() => (
          <pre {...$restProps} ref={preRef} className={props.className}>
            {props.children}
          </pre>
        )}
      </Snippet>
    </div>
  );
}, 'CodeBlock');
