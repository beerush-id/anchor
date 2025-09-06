import { Section } from '@components/Section.js';
import {
  ClipboardClock,
  CloudCheck,
  DatabaseZap,
  GitFork,
  ListTodo,
  ShieldCheck,
  SquareDashedMousePointer,
} from 'lucide-react';
import { MainCTA } from '@components/MainCTA.js';

export const Architecture = () => {
  return (
    <Section id="architecture" className="max-w-6xl px-4 mx-auto gap-6 flex flex-col">
      <div className="text-center md:mb-12">
        <h2 className="text-4xl md:text-6xl font-light text-white mb-6 leading-tight tracking-tighter">
          Anchor's Architectural Blueprint
        </h2>
        <p className="section-subtitle text-slate-300 text-lg">
          Beyond its impressive performance, the Anchor architecture introduces fundamental advancements in state
          management and developer utilities, enhancing both application capabilities and the development workflow.{' '}
        </p>
      </div>
      <div className="card p-6 md:p-12 flex flex-col gap-4">
        <h3 className="text-2xl font-light">The Anchor Mental Model</h3>
        <p className="text-slate-400">
          The core of Anchor's philosophy is built on three pillars:{' '}
          <strong className="font-medium text-slate-300">True Immutability</strong>,{' '}
          <strong className="font-medium text-slate-300">Data Integrity</strong>, and{' '}
          <strong className="font-medium text-slate-300">Fine-Grained Reactivity</strong>. These concepts ensure robust,
          performant, and reliable applications from the ground up.
        </p>
        <ul className="flex flex-col gap-3 mt-4">
          <li className="flex items-start gap-4">
            <div className="icon py-1">
              <ShieldCheck className="w-10 h-10 text-slate-300" />
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-slate-300 text-lg font-medium">True Immutability</h4>
              <ul className="pl-4 list-disc text-sm text-slate-400 flex flex-col gap-2">
                <li>
                  <p>
                    Anchor pioneers a true immutable model that cleverly sidesteps the typical performance overhead
                    associated with deep copying large state trees.
                  </p>
                </li>
                <li>
                  <p>
                    It allows you to write intuitive{' '}
                    <strong className="font-medium text-slate-300">"direct mutation"</strong> code within strictly
                    controlled <strong className="font-medium text-slate-300">"write contracts"</strong>, without
                    sacrificing state integrity. This is a massive win for both performance and developer experience.
                  </p>
                </li>
                <li>
                  <p>
                    <strong className="font-medium text-slate-300">Strongly typed</strong>: It's also strongly typed. If
                    you declare a state, you'll be warned or prevented from making a mutation in the IDE.
                  </p>
                </li>
              </ul>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <div className="icon py-1">
              <GitFork className="w-10 h-10 text-slate-300" />
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-slate-300 text-lg font-medium">Data Integrity</h4>
              <ul className="pl-4 list-disc text-sm text-slate-400 flex flex-col gap-2">
                <li>
                  <p>Anchor champions data integrity by integrating Zod schemas as a first-citizen class.</p>
                </li>
                <li>
                  <p>
                    This ensures your data always conforms to its defined structure and types, both during development
                    and at runtime.
                  </p>
                </li>
                <li>
                  <p>
                    It provides a single source of truth for your data and a reliable foundation for your application.
                  </p>
                </li>
              </ul>
            </div>
          </li>
          <li className="flex items-start gap-4">
            <div className="icon py-1">
              <SquareDashedMousePointer className="w-10 h-10 text-slate-300" />
            </div>
            <div className="flex flex-col gap-3">
              <h4 className="text-slate-300 text-lg font-medium">Fine-Grained Reactivity</h4>
              <ul className="pl-4 list-disc text-sm text-slate-400 flex flex-col gap-2">
                <li>
                  <p>
                    Anchor provides fine-grained reactivity. This means that when a piece of state changes, only the
                    exact components that depend on that specific piece of state are re-rendered.
                  </p>
                </li>
                <li>
                  <p>
                    This contrasts sharply with broader re-rendering strategies, significantly reducing computational
                    overhead and ensuring the fastest possible UI updates.
                  </p>
                </li>
              </ul>
            </div>
          </li>
        </ul>
      </div>
      <div className="card p-6 md:p-12 flex flex-col gap-4">
        <h3 className="text-2xl font-light">Seamlessly Integrated Built-ins</h3>
        <p className="text-slate-400">
          Anchor's rich suite of built-in utilities covers common application needs, providing powerful, ready-to-use
          solutions with elegant APIs.
        </p>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <li className="card p-6 flex items-start gap-3">
            <div className="icon py-1">
              <ListTodo className="w-6 h-6 text-slate-300" />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-slate-300 text-lg font-medium">Optimistic Model</h4>
              <p className="text-slate-400 text-sm">
                The <strong className="inline-code">Optimistic Model</strong> makes UI updates instantly in response to
                user actions, even before a server response is received. This creates a highly responsive feel,
                eliminating perceived latency and enhancing user satisfaction.
              </p>
            </div>
          </li>
          <li className="card p-6 flex items-start gap-3">
            <div className="icon py-1">
              <ClipboardClock className="w-6 h-6 text-slate-300" />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-slate-300 text-lg font-medium">History Utility</h4>
              <p className="text-slate-400 text-sm">
                Anchor provides an out-of-the-box History utility that automatically tracks state changes. This gives
                you <strong className="inline-code">built-in undo/redo functionality</strong> with virtually no
                additional development effort.
              </p>
            </div>
          </li>
          <li className="card p-6 flex items-start gap-3">
            <div className="icon py-1">
              <DatabaseZap className="w-6 h-6 text-slate-300" />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-slate-300 text-lg font-medium">Reactive Storage</h4>
              <p className="text-slate-400 text-sm">
                Work with <strong className="inline-code">localStorage</strong>,{' '}
                <strong className="inline-code">sessionStorage</strong>, and{' '}
                <strong className="inline-code">IndexedDB</strong> just like plain objects. Anchor provides a true
                two-way storage binding that automatically syncs data, ensuring your application state is always
                up-to-date.
              </p>
            </div>
          </li>
          <li className="card p-6 flex items-start gap-3">
            <div className="icon py-1">
              <CloudCheck className="w-6 h-6 text-slate-300" />
            </div>
            <div className="flex flex-col gap-2">
              <h4 className="text-slate-300 text-lg font-medium">Reactive Request</h4>
              <p className="text-slate-400 text-sm">
                Handle asynchronous requests and <strong className="inline-code">server-sent events (SSE)</strong>{' '}
                incredibly simply and reactively. Received data chunks automatically update the UI, providing{' '}
                <strong className="inline-code">real-time</strong>
                experiences with ease.
              </p>
            </div>
          </li>
        </ul>
      </div>
      <MainCTA className="mt-10 md:mt-20" />
    </Section>
  );
};
