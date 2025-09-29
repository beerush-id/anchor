'use client';

import { Section, SectionDescription, SectionTitle } from '@anchorlib/react-kit/components';
import { GithubIcon } from '@anchorlib/react-kit/icons';
import EditorApp from '@components/editor/EditorApp';

export function EditorDemo() {
  return (
    <Section className="page-section">
      <SectionTitle>Make Complicated Things Simple</SectionTitle>
      <SectionDescription className={'text-center md:mb-12'}>
        To build something like this, normally you'll sacrifice either UX or DX. You pick faster build - slower
        performance, or faster performance - slower build. With Anchor, you can have both; faster build and superior
        performance.
      </SectionDescription>
      <EditorApp />
      <p className="text-center text-slate-600 dark:text-slate-300 my-4 max-w-2xl mx-auto">
        Experience a truly declarative syntax in your JSX. Spend your time to focus on your application logic instead of
        fighting on how to make it work.
      </p>
      <a
        href="https://github.com/beerush-id/anchor/tree/main/apps/next/components/editor"
        target="_blank"
        className="h-[54px] flex whitespace-nowrap items-center px-6 py-3 bg-slate-900 hover:bg-brand-main-hover text-slate-200 rounded-md font-medium btn-secondary transition-colors">
        <GithubIcon className="w-5 h-5 mr-2" />
        Source Code
      </a>
    </Section>
  );
}
