import { anchor } from '@anchor/core';
import { createHighlighter, type Highlighter } from 'shiki/bundle/web';
import React, { useState } from 'react';
import { useDerivedMemo } from '@anchor/react';
import { Book } from 'lucide-react';

const shiki = anchor<{ highlighter?: Highlighter }>({}, { recursive: false });

createHighlighter({
  themes: ['catppuccin-mocha'],
  langs: ['jsx', 'javascript', 'bash', 'tsx', 'typescript'],
}).then((highlighter) => {
  shiki.highlighter = highlighter;
});

// --- Shiki CodeBlock Component ---
let codeId = 1;
export const CodeBlock: React.FC<{ code: string; lang?: string }> = ({ code, lang = 'jsx' }) => {
  const [id] = useState(`code-${codeId++}`);
  const [html] = useDerivedMemo(
    shiki,
    ({ highlighter }) => {
      console.log('Rendering html code');
      return highlighter && highlighter.codeToHtml(code, { lang, theme: 'catppuccin-mocha' });
    },
    [code, lang]
  );

  console.log('Rendering code block:', id);

  if (html) {
    return <div className="code-block" dangerouslySetInnerHTML={{ __html: html }} />;
  } else {
    return (
      <div className="p-6">
        <div className="text-center">
          <Book size={32} className="mx-auto mb-4 text-slate-500" />
          <p className="text-slate-500">Shiki is loading...</p>
        </div>
      </div>
    );
  }
};
