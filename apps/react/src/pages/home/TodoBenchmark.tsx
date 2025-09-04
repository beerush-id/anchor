import { useState } from 'react';
import { ClassicTodoApp } from '@components/todo-classic/ClassicTodoApp.js';
import { RenderStats } from '@components/stats/RenderStats.js';
import { classicTodoStats, todoStats } from '@lib/stats.js';
import { TodoApp } from '@components/todo/TodoApp.js';
import { Section, SectionDescription, SectionTitle } from '@components/Section.js';

export const TodoBenchmark = () => {
  const [showDemo, setShowDemo] = useState(true);
  if (!showDemo) {
    return <button onClick={() => setShowDemo(true)}>Show Demo</button>;
  }
  return (
    <>
      <Section id="todo-benchmark" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 min-h-screen">
        <SectionTitle>Try It Yourself: FLOOD THE DOM!</SectionTitle>
        <SectionDescription className="text-center mt-4 max-w-4xl mx-auto">
          This demo is built with profiling enabled, allowing you to use React DevTools to analyze render times and see
          how Anchor's fine-grained reactivity prevent re-renders, while a classic approach can cause performance to
          degrade as the app scales.
        </SectionDescription>
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
        <blockquote className="mt-12 text-center max-w-3xl mx-auto text-lg italic text-slate-400 leading-relaxed">
          "A well-engineered app stays performant whether it's displaying one item or thousands. Its performance doesn't
          degrade as it scales."
        </blockquote>
      </Section>
    </>
  );
};
