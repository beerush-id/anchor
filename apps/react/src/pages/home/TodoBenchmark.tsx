import { memo, useState } from 'react';
import { ClassicTodoApp } from '@components/todo-classic/ClassicTodoApp.js';
import { RenderStats } from '@components/stats/RenderStats.js';
import { classicTodoStats, manualTodoStats, todoStats } from '@lib/stats.js';
import { TodoApp } from '@components/todo/TodoApp.js';
import { Section, SectionDescription, SectionTitle } from '@components/Section.js';
import { ManualTodoApp } from '@components/todo-manual/ManualTodoApp.js';
import { Button } from '@components/Button.js';
import { Zap, ZapOff } from 'lucide-react';
import { Tooltip } from '@components/Tooltip.js';

const AnchorTodoApp = memo(TodoApp);
const OptimizedTodoApp = memo(ManualTodoApp);
const DefaultTodoApp = memo(ClassicTodoApp);

export const TodoBenchmark = () => {
  const [showDemo, setShowDemo] = useState(true);
  const [optimized, setOptimized] = useState(false);

  if (!showDemo) {
    return <button onClick={() => setShowDemo(true)}>Show Demo</button>;
  }

  return (
    <>
      <Section id="todo-benchmark" className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 md:min-h-screen">
        <SectionTitle>Try It Yourself: FLOOD THE DOM!</SectionTitle>
        <SectionDescription className="text-center mt-4 max-w-4xl mx-auto">
          This demo is built with profiling enabled, allowing you to use React DevTools to analyze performance as it
          scales. It highlights how the same complexity effort can lead to vastly different performance outcomes,
          powered by Anchor.
        </SectionDescription>
        <div className="flex items-center mt-12 justify-center py-4">
          <Button onClick={() => setOptimized((c) => !c)}>
            {!optimized ? <Zap size={16} /> : <ZapOff size={16} />}
            <span>Use {optimized ? 'Classic' : 'Optimized'} Version</span>
            <Tooltip>Use the AI optimized version with optimization they can think of</Tooltip>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex-1 flex flex-col gap-4">
            {!optimized && (
              <>
                <DefaultTodoApp />
                <RenderStats
                  stats={[classicTodoStats.app, classicTodoStats.form, classicTodoStats.list, classicTodoStats.item]}
                />
              </>
            )}
            {optimized && (
              <>
                <OptimizedTodoApp />
                <RenderStats
                  stats={[manualTodoStats.app, manualTodoStats.form, manualTodoStats.list, manualTodoStats.item]}
                />
              </>
            )}
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <AnchorTodoApp />
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
