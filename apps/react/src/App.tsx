import React from 'react';
import { useAnchor } from '@anchor/react'; // <-- The beautiful, clean import!
import { Book, Copy, Minus, Plus, Trash2 } from 'lucide-react';
import { Button } from './components/Button.js';
import { CodeBlock } from './components/CodeBlock.js';
import { TodoApp } from './components/todo/TodoApp.js';
import { ClassicTodoApp } from './components/todo-classic/ClassicTodoApp.js';
import { ControlPanel } from './components/control-panel/ControlPanel.js';
import { RenderStats } from './components/stats/RenderStats.js';
import { classicTodoStats, todoStats } from './components/stats/stats.js';

// --- Reusable UI Components ---
const Section: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <section
    className={`py-5 sm:py-4 w-full min-h-screen flex flex-col justify-center snap-center snap-always ${className}`}>
    {children}
  </section>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-3xl sm:text-4xl font-bold text-center tracking-tight">
    <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-orange to-brand-purple">{children}</span>
  </h2>
);

const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden ${className}`}>{children}</div>
);

const CardHeader: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-4 bg-slate-800/50 border-b border-slate-700/50">
    <h3 className="font-semibold text-slate-200">{children}</h3>
  </div>
);

// --- Demo Components ---

// 1. Todo Anchor Demo
const TodoListDemo = () => {
  console.log('Rendering Todo Demo');

  return (
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
  );
};

// 3. Derive Demo
const ShoppingCartDemo = () => {
  const [cart] = useAnchor({
    items: [
      { id: 1, name: 'Quantum Keyboard', price: 199, quantity: 1 },
      { id: 2, name: 'Flux Capacitor Mouse', price: 89, quantity: 2 },
      { id: 3, name: 'Temporal Mousepad', price: 25, quantity: 1 },
    ],
  });

  const subtotal = cart.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const summary = {
    subtotal,
    tax: subtotal * 0.08,
    total: subtotal + subtotal * 0.08,
  };

  return (
    <div className="mt-12">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>Your Cart</CardHeader>
            <div className="p-6 space-y-4">
              {cart.items.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-sm text-slate-400">${item.price.toFixed(2)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => (item.quantity = Math.max(1, item.quantity - 1))} className="p-2">
                      <Minus size={14} />
                    </Button>
                    <span className="font-mono w-8 text-center">{item.quantity}</span>
                    <Button onClick={() => item.quantity++} className="p-2">
                      <Plus size={14} />
                    </Button>
                    <Button
                      onClick={() => cart.items.splice(index, 1)}
                      className="p-2 ml-4 text-red-400 hover:bg-red-900/50">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-slate-950">
              <CodeBlock
                code={`
const cart = useAnchor({
  items: [
    { name: 'Quantum Keyboard', price: 199, quantity: 1 },
    // ... more items
  ]
});

// Mutate directly:
item.quantity++;
cart.items.splice(index, 1);
              `}
              />
            </div>
          </Card>
        </div>

        {/* Summary */}
        <div>
          <Card>
            <CardHeader>Order Summary</CardHeader>
            <div className="p-6 space-y-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Subtotal</span>
                <span className="font-mono">${summary.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Tax (8%)</span>
                <span className="font-mono">${summary.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t border-slate-700 font-bold text-lg">
                <span className="text-slate-200">Total</span>
                <span className="font-mono text-brand-orange">${summary.total.toFixed(2)}</span>
              </div>
            </div>
            <div className="bg-slate-950">
              <CodeBlock
                code={`
const summary = derive(cart, c => {
  const subtotal = c.items.reduce(
    (acc, item) => acc + item.price * item.quantity, 0
  );
  const tax = subtotal * 0.08;
  const total = subtotal + tax;
  return { subtotal, tax, total };
});

// 'summary' now updates automatically!
              `}
              />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// The main App component
export default function App() {
  return (
    <div className="w-screen bg-slate-950">
      <main className="container mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 h-screen overflow-y-scroll snap-y snap-mandatory">
        {/* Header */}
        <header className="text-center py-20 sm:py-28 h-screen flex flex-col items-center justify-center snap-center snap-always">
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter">
            <span className="bg-clip-text text-transparent bg-gradient-to-br from-orange-400 via-orange-500 to-purple-500">
              Anchor.
            </span>
            <span className="text-slate-400"> Mutable State, Mastered.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-400">
            A React state library that embraces mutation, simplifies your code, and makes complex state management feel
            effortless.
          </p>
        </header>

        {/* Todo Anchor Demo */}
        <Section>
          <SectionTitle>Why write schedulers when you can just... push?</SectionTitle>
          <p className="text-center text-slate-400 mt-4 max-w-2xl mx-auto">
            See how Anchor simplifies array manipulations, turning complex `map` and spread operations into simple,
            direct mutations.
          </p>
          <TodoListDemo />
        </Section>

        {/* Pipe Demo */}
        <Section>
          <SectionTitle>Why bridge state to the DOM when you can just... pipe it?</SectionTitle>
          <p className="text-center text-slate-400 mt-4 max-w-2xl mx-auto">
            Use `derive.pipe` to create powerful, one-way data flows from your state directly to any target, like a DOM
            element's style, with on-the-fly transforms.
          </p>
          <ControlPanel />
        </Section>

        {/* Derive Demo */}
        <Section>
          <SectionTitle>Why re-calculate on every render when you can just... derive?</SectionTitle>
          <p className="text-center text-slate-400 mt-4 max-w-2xl mx-auto">
            Create computed state that reacts automatically to changes in your source anchors. Efficient, declarative,
            and boilerplate-free.
          </p>
          <ShoppingCartDemo />
        </Section>

        {/* Installation & CTA */}
        <Section className="text-center">
          <SectionTitle>Ready to Anchor Your State?</SectionTitle>
          <p className="mt-4 text-slate-400">
            Get started in seconds. Install the package and simplify your app today.
          </p>
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
    </div>
  );
}
