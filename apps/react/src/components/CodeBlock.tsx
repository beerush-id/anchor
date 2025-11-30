import { anchor } from '@anchorlib/core';
import { createHighlighter, type Highlighter } from 'shiki/bundle/web';
import { type FC, useRef } from 'react';
import { debugRender, useObserver } from '@anchorlib/react-classic';
import { LoaderCircle } from 'lucide-react';
import { isMobile } from '@lib/nav.js';

const shiki = anchor<{ highlighter?: Highlighter }>({}, { recursive: false });

if (!isMobile()) {
  createHighlighter({
    themes: ['catppuccin-mocha'],
    langs: ['jsx', 'javascript', 'bash', 'tsx', 'typescript', 'css', 'json'],
  }).then((highlighter) => {
    shiki.highlighter = highlighter;
  });
}

export const CodeBlock: FC<{
  code: string;
  lang?: string;
  className?: string;
}> = ({ code, lang = 'jsx', className }) => {
  const ref = useRef(null);
  const output = useObserver(() => {
    const { highlighter } = shiki;
    return highlighter && highlighter.codeToHtml(code, { lang, theme: 'catppuccin-mocha' });
  }, [code, lang]);

  debugRender(ref);

  if (isMobile()) {
    return;
  }

  if (output) {
    return <div ref={ref} className={`code-block ${className}`} dangerouslySetInnerHTML={{ __html: output }} />;
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
