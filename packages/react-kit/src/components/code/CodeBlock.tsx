import { anchor, microtask } from '@anchorlib/core';
import { createHighlighter, type Highlighter } from 'shiki/bundle/web';
import { type HTMLAttributes, useEffect } from 'react';
import { useObserver } from '@anchorlib/react';
import { LoaderCircle } from '@icons/index.js';
import type { EFC } from '../../types.js';
import { classx, stylex } from '@utils/classx.js';
import { transformerNotationDiff, transformerNotationFocus, transformerNotationHighlight } from '@shikijs/transformers';

const shiki = anchor<{ highlighter?: Highlighter }>({}, { recursive: false });

const [schedule] = microtask(0);
const initialize = () => {
  if (shiki.highlighter) return;

  createHighlighter({
    themes: ['catppuccin-mocha', 'catppuccin-latte'],
    langs: ['html', 'jsx', 'javascript', 'bash', 'tsx', 'typescript', 'css', 'json', 'vue', 'svelte'],
  }).then((highlighter) => {
    shiki.highlighter = highlighter;
  });
};

export type CodeBlockProps = {
  code: string;
  lang?: string;
  className?: string;
  maxHeight?: number;
  minHeight?: number;
};

export const CodeBlock: EFC<HTMLAttributes<HTMLDivElement> & CodeBlockProps, HTMLDivElement> = ({
  code,
  lang = 'jsx',
  maxHeight,
  minHeight,
  className,
}) => {
  const output = useObserver(() => {
    const { highlighter } = shiki;
    return (
      highlighter &&
      highlighter.codeToHtml(code.trim(), {
        lang,
        themes: {
          dark: 'catppuccin-mocha',
          light: 'catppuccin-latte',
        },
        transformers: [transformerNotationDiff(), transformerNotationHighlight(), transformerNotationFocus()],
      })
    );
  }, [code, lang]);

  useEffect(() => {
    schedule(initialize);
  }, [shiki.highlighter]);

  if (output) {
    return (
      <div
        className={classx(classx.brand('code-block'), className)}
        dangerouslySetInnerHTML={{ __html: output }}
        style={stylex({ '--code-max-height': maxHeight, '--code-min-height': minHeight })}
      />
    );
  } else {
    return (
      <div
        className={classx(classx.brand('code-block'), classx.brand('code-block-loading'), className)}
        style={stylex({ '--code-max-height': maxHeight, '--code-min-height': minHeight })}>
        <LoaderCircle className="mx-auto mb-4 text-slate-500 animate-spin" width={32} height={32} />
        <p className="text-slate-500 text-xs font-bold">Loading code block...</p>
      </div>
    );
  }
};
