import { anchor } from '@anchor/core';
import { createHighlighter, type Highlighter } from 'shiki/bundle/web';
import React, { useRef } from 'react';
import { useDerived } from '@anchor/react';
import { Book } from 'lucide-react';
import { flashNode } from './stats/stats.js';

const shiki = anchor<{ highlighter?: Highlighter }>({}, { recursive: false });

createHighlighter({
  themes: ['catppuccin-mocha'],
  langs: ['jsx', 'javascript', 'bash', 'tsx', 'typescript'],
}).then((highlighter) => {
  shiki.highlighter = highlighter;
});

// --- Shiki CodeBlock Component ---
export const CodeBlock: React.FC<{ code: string; lang?: string }> = ({ code, lang = 'jsx' }) => {
  const ref = useRef(null);
  const [html] = useDerived(shiki, ({ highlighter }) => {
    return highlighter && highlighter.codeToHtml(code, { lang, theme: 'catppuccin-mocha' });
  });

  flashNode(ref.current);

  if (html) {
    return <div ref={ref} className="code-block" dangerouslySetInnerHTML={{ __html: html }} />;
  } else {
    return (
      <div ref={ref} className="p-6">
        <div className="text-center">
          <Book size={32} className="mx-auto mb-4 text-slate-500" />
          <p className="text-slate-500">Shiki is loading...</p>
        </div>
      </div>
    );
  }
};
