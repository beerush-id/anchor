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
import { MainCTA } from '@components/MainCTA.js';

export default function Home() {
  return (
    <>
      <Header />
      <main className="w-screen bg-slate-900 text-white">
        <Hero />
        <Performance />
        <Philosophy />
        <Architecture />
        <TodoBenchmark />

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

        {/* Installation & CTA */}
        <Section className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
          <SectionTitle>Ready to Anchor Your State?</SectionTitle>
          <p className="mt-4 text-slate-400">
            Get started in seconds. Install the package and simplify your app today.
          </p>
          <MainCTA tiys={false} className="w-full my-10 md:my-20" />
        </Section>

        <footer className="text-center py-8 text-slate-300 text-sm">
          <p>
            © {new Date().getFullYear()} Anchor. All rights reserved. Built with ❤️ by{' '}
            <a
              href="https://www.mahdaen.name"
              target="_blank"
              className="font-medium hover:text-slate-300 transition-colors">
              Nanang Mahdaen El Agung
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
