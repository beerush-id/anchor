import { anchor } from '@anchor/core';
import { createHighlighter, type Highlighter } from 'shiki/bundle/web';
import { type FC, useRef } from 'react';
import { useDerived } from '@anchor/react';
import { LoaderCircle } from 'lucide-react';
import { flashNode } from '@lib/stats.js';

const shiki = anchor<{ highlighter?: Highlighter }>({}, { recursive: false });

createHighlighter({
  themes: ['catppuccin-mocha'],
  langs: ['jsx', 'javascript', 'bash', 'tsx', 'typescript'],
}).then((highlighter) => {
  shiki.highlighter = highlighter;
});

export const CodeBlock: FC<{ code: string; lang?: string }> = ({ code, lang = 'jsx' }) => {
  const ref = useRef(null);
  const output = useDerived(() => {
    const { highlighter } = shiki;
    return highlighter && highlighter.codeToHtml(code, { lang, theme: 'catppuccin-mocha' });
  }, [code, lang]);

  flashNode(ref.current);

  if (output) {
    return <div ref={ref} className="code-block" dangerouslySetInnerHTML={{ __html: output }} />;
  } else {
    return (
      <div ref={ref} className="p-6">
        <div className="text-center">
          <LoaderCircle size={32} className="mx-auto mb-4 text-slate-500 animate-spin" />
          <p className="text-slate-500 text-xs font-bold">Loading code block...</p>
        </div>
      </div>
    );
  }
};
