import { type FC, type ReactNode, useState } from 'react';
import { Book, Copy } from 'lucide-react';
import { TodoApp } from '@components/todo/TodoApp.js';
import { ClassicTodoApp } from '@components/todo-classic/ClassicTodoApp.js';
import { ControlPanel } from '@components/control-panel/ControlPanel.js';
import { RenderStats } from '@components/stats/RenderStats.js';
import { classicTodoStats, todoStats } from '@lib/stats.js';
import { CartApp } from '@components/cart/CartApp.js';
import { Auth } from '@components/auth/Auth.js';

const Section: FC<{ children: ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section
    className={`py-5 sm:py-4 w-full min-h-screen flex flex-col justify-center snap-center snap-always ${className}`}>
    {children}
  </section>
);

const SectionTitle: FC<{ children: ReactNode }> = ({ children }) => (
  <h2 className="text-3xl sm:text-4xl font-light uppercase text-center tracking-tight">
    <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-orange to-brand-purple">{children}</span>
  </h2>
);

const TodoListDemo = () => {
  const [showDemo, setShowDemo] = useState(true);
  if (!showDemo) {
    return <button onClick={() => setShowDemo(true)}>Show Demo</button>;
  }
  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-12">
        <div className="flex-1 flex flex-col gap-4">
          <ClassicTodoApp />
          <RenderStats
            stats={[classicTodoStats.app, classicTodoStats.form, classicTodoStats.list, classicTodoStats.item]}
          />
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <TodoApp />
          <RenderStats stats={[todoStats.app, todoStats.form, todoStats.list, todoStats.item]} />
        </div>
      </div>
    </>
  );
};

export default function App() {
  return (
    <main className="bg-slate-950 w-screen">
      {/* Todo Anchor Demo */}
      <Section className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionTitle>Reactive, Intuitive, and Productive</SectionTitle>
        <p className="text-center text-slate-400 mt-4 max-w-2xl mx-auto">
          Transform complex map and spread syntax into simple, direct mutations that feel natural. Anchor ensures that
          only the components that actually changed re-render.
        </p>
        <TodoListDemo />
      </Section>

      {/* Pipe Demo */}
      <Section className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionTitle>No Bridge, Just Pipe!</SectionTitle>
        <p className="text-center text-slate-400 mt-4 max-w-2xl mx-auto">
          Use <code className="inline-code">derive.pipe()</code> to create powerful, one-way data flows from your state
          directly to any target, like a DOM element's style, with on-the-fly transforms.
        </p>
        <ControlPanel />
      </Section>

      {/* Pipe Demo */}
      <Section className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionTitle>Write Once, Use Everywhere</SectionTitle>
        <p className="text-center text-slate-400 mt-4 max-w-2xl mx-auto">
          No providers, no context, no boilerplate. Declare your state once and use it anywhere in your application with
          simple syntax. Share state seamlessly across components.
        </p>
        <Auth />
      </Section>

      {/* Derive Demo */}
      <Section className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <SectionTitle>Readable and Human-Predictable</SectionTitle>
        <p className="text-center text-slate-400 mt-4 max-w-2xl mx-auto">
          Create computed state that automatically responds to changes. Efficient, declarative, and boilerplate-free.
          Smart rendering ensures components update only when necessary.
        </p>
        <CartApp />
      </Section>

      {/* Installation & CTA */}
      <Section className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 text-center">
        <SectionTitle>Ready to Anchor Your State?</SectionTitle>
        <p className="mt-4 text-slate-400">Get started in seconds. Install the package and simplify your app today.</p>
        <div className="my-8">
          <div className="inline-flex items-center bg-slate-900 rounded-lg p-1 pr-4 font-mono text-slate-300 border border-slate-700">
            <span className="text-purple-400 p-2">$</span>
            <span className="mr-4">npm install @anchor/react</span>
            <button
              onClick={() => navigator.clipboard.writeText('npm install @anchor/react')}
              className="text-slate-500 hover:text-white">
              <Copy size={16} />
            </button>
          </div>
        </div>
        <div className="flex justify-center gap-4">
          <a
            href="#"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-lg bg-brand-purple text-white hover:bg-purple-500 transition-colors">
            <Book size={20} />
            Read the Docs
          </a>
        </div>
      </Section>

      <footer className="text-center py-8 text-slate-500 text-sm">
        <p>Built to showcase the power of Anchor. © {new Date().getFullYear()}</p>
      </footer>
    </main>
  );
}
