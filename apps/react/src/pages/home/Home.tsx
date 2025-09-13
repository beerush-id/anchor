import { ControlPanel } from '@components/control-panel/ControlPanel.js';
import { CartApp } from '@components/cart/CartApp.js';
import { Auth } from '@components/auth/Auth.js';
import { Section, SectionTitle } from '@components/Section.js';
import { Hero } from './Hero.js';
import { Header } from '@components/Header.js';
import { TodoBenchmark } from './TodoBenchmark.js';
import { Performance } from './Performance.js';
import { Philosophy } from './Philosophy.js';
import { Architecture } from './Architecture.js';
import { EditorDemo } from './EditorDemo.js';
import { useCtaHoverCount } from '@lib/nav.js';
import { Footer } from './Footer.js';

export default function Home() {
  useCtaHoverCount();

  return (
    <>
      <Header />
      <main className="w-screen bg-slate-900 text-white">
        <Hero />
        <EditorDemo />

        <Performance />
        <TodoBenchmark />

        <Philosophy />
        <Architecture />

        <Section className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionTitle>No Bridge, Just Pipe!</SectionTitle>
          <p className="text-center text-slate-300 mt-4 max-w-2xl mx-auto">
            Use <code className="inline-code">derive.pipe()</code> to create powerful, one-way data flows from your
            state directly to any target, like a DOM element's style, with on-the-fly transforms.
          </p>
          <ControlPanel />
        </Section>

        <Auth />

        {/* Derive Demo */}
        <Section className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionTitle>Readable and Human-Predictable</SectionTitle>
          <p className="text-center text-slate-300 mt-4 max-w-2xl mx-auto">
            Create computed state that automatically responds to changes. Efficient, declarative, and boilerplate-free.
            Smart rendering ensures components update only when necessary.
          </p>
          <CartApp />
        </Section>
        <Footer />
      </main>
    </>
  );
}
