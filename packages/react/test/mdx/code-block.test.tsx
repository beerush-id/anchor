import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import '../../src/client/index.js';
import { CodeBlock } from '../../src/mdx/CodeBlock.js';

describe('Code Snippet Block', () => {
  describe('Language & Title Display', () => {
    it('extracts language and title from code element to give reader snippet context', () => {
      const { container } = render(
        <CodeBlock>
          <pre>
            <code data-language="ts" data-title="src/index.ts">
              console.log("hello");
            </code>
          </pre>
        </CodeBlock>
      );

      const titleEl = container.querySelector('.air-mdx-code-block-title');
      expect(titleEl).not.toBeNull();
      expect(titleEl?.textContent).toContain('src/index.ts');
      expect(titleEl?.textContent).toContain('TS');
    });

    it('displays uppercase language badge when only language is defined', () => {
      const { container } = render(
        <CodeBlock>
          <code data-language="json">{'{"key": "value"}'}</code>
        </CodeBlock>
      );

      const titleEl = container.querySelector('.air-mdx-code-block-title');
      expect(titleEl?.textContent).toBe('JSON');
    });

    it('displays only title when language is not defined', () => {
      const { container } = render(
        <CodeBlock>
          <code data-title="Terminal Output">$ npm install</code>
        </CodeBlock>
      );

      const titleEl = container.querySelector('.air-mdx-code-block-title');
      expect(titleEl?.textContent).toBe('Terminal Output');
    });

    it('omits header banner when code element has neither title nor language', () => {
      const { container } = render(
        <CodeBlock>
          <pre>
            <code>plain text snippet</code>
          </pre>
        </CodeBlock>
      );

      const titleEl = container.querySelector('.air-mdx-code-block-title');
      expect(titleEl).toBeNull();
    });

    it('extracts metadata from array of children or nested wrappers', () => {
      const { container } = render(
        <CodeBlock>
          <div>
            <span>
              <code data-language="bash" data-title="Terminal">
                git status
              </code>
            </span>
          </div>
        </CodeBlock>
      );

      const titleEl = container.querySelector('.air-mdx-code-block-title');
      expect(titleEl?.textContent).toContain('Terminal');
      expect(titleEl?.textContent).toContain('BASH');
    });

    it('searches across sibling elements in an array until finding code element', () => {
      const { container } = render(
        <CodeBlock>
          {[
            <div key="comment">{/* note */}</div>,
            <pre key="code">
              <code data-language="sql" data-title="query.sql">
                SELECT 1;
              </code>
            </pre>,
          ]}
        </CodeBlock>
      );

      const titleEl = container.querySelector('.air-mdx-code-block-title');
      expect(titleEl?.textContent).toContain('query.sql');
      expect(titleEl?.textContent).toContain('SQL');
    });

    it('returns undefined title when array of children contains no code element', () => {
      const { container } = render(<CodeBlock>{[<span key="1">Just</span>, <span key="2">text</span>]}</CodeBlock>);

      const titleEl = container.querySelector('.air-mdx-code-block-title');
      expect(titleEl).toBeNull();
    });

    it('safely handles null or undefined children without crashing', () => {
      const { container } = render(<CodeBlock>{null}</CodeBlock>);
      expect(container.querySelector('.air-mdx-code-block-title')).toBeNull();
    });

    it('safely handles raw string text children without crashing', () => {
      const { container } = render(<CodeBlock>plain text inside code block</CodeBlock>);
      expect(container.textContent).toContain('plain text inside code block');
      expect(container.querySelector('.air-mdx-code-block-title')).toBeNull();
    });
  });

  describe('Copy Action Integration', () => {
    it('includes a copy button by default for reader convenience', () => {
      const { container } = render(
        <CodeBlock>
          <pre>
            <code data-language="js">const x = 1;</code>
          </pre>
        </CodeBlock>
      );

      const copyBtn = container.querySelector('.air-mdx-copy-btn');
      expect(copyBtn).not.toBeNull();
    });

    it('allows authors to hide the copy button for non-interactive output blocks', () => {
      const { container } = render(
        <CodeBlock hideCopy>
          <pre>
            <code data-language="text">Build succeeded in 1.2s</code>
          </pre>
        </CodeBlock>
      );

      const copyBtn = container.querySelector('.air-mdx-copy-btn');
      expect(copyBtn).toBeNull();
    });
  });

  describe('Container & Styling', () => {
    it('applies standard wrapper class and forwards custom attributes', () => {
      const { container } = render(
        <CodeBlock className="custom-snippet" id="snippet-1" data-highlight="true">
          <pre>
            <code>echo 1</code>
          </pre>
        </CodeBlock>
      );

      const wrapper = container.querySelector('.air-mdx-code-block-wrapper');
      expect(wrapper).not.toBeNull();
      expect(wrapper?.className).toContain('custom-snippet');
      expect(wrapper?.id).toBe('snippet-1');
      expect(wrapper?.getAttribute('data-highlight')).toBe('true');
    });
  });
});
