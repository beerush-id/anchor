import { Section, SectionTitle } from '@components/Section.js';
import EditorApp from '@components/editor/EditorApp.js';
import { MainCTA } from '@components/MainCTA.js';
import { GithubIcon } from 'lucide-react';

export function EditorDemo() {
  return (
    <Section>
      <SectionTitle>Make Complicated Things Simple</SectionTitle>
      <p className="text-center text-slate-300 mt-4 max-w-4xl mx-auto mb-10">
        To build something like this, normally you'll sacrifice either UX or DX. You pick faster build - slower
        performance, or faster performance - slower build. With Anchor, you can have both; faster build and superior
        performance.
      </p>
      <EditorApp />
      <p className="text-center text-slate-300 mt-4 max-w-2xl mx-auto mt-16 mb-10">
        Experience a truly declarative syntax in your JSX. Spend your time to focus on your application logic instead of
        fighting on how to make it work.
      </p>
      <MainCTA tiys={false}>
        <a
          href="https://github.com/beerush-id/anchor/tree/main/apps/react/src/components/editor"
          target="_blank"
          className="flex whitespace-nowrap items-center px-6 py-3 bg-slate-900 hover:bg-brand-main-hover text-slate-200 rounded-md font-medium btn-secondary transition-colors">
          <GithubIcon className="w-5 h-5 mr-2" />
          Source Code
        </a>
      </MainCTA>
    </Section>
  );
}
