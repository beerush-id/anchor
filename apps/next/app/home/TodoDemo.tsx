'use client';

import { memo } from 'react';
import { Section, SectionDescription, SectionTitle } from '@anchorlib/react-kit/components';

import { classicTodoStats, todoStats } from '@utils/stats';
import { RenderStats } from '@components/stats/RenderStats';
import { ClassicTodoApp } from '@components/todo-classic/ClassicTodoApp';
import { TodoApp } from '@components/todo/TodoApp';
import { view } from '@anchorlib/react-classic';
import { anchorReport, classicReport } from '@utils/todo';
import { BenchmarkReport } from '@components/stats/BenchmarkReport';

const AnchorTodoApp = memo(TodoApp);
const DefaultTodoApp = memo(ClassicTodoApp);

export const TodoDemo = () => {
  const ClassicReport = view(() => {
    if (!classicReport.enabled) return;

    return <BenchmarkReport metrics={classicReport.metrics} stats={classicReport.stats} />;
  });
  const AnchorReport = view(() => {
    if (!anchorReport.enabled) return;

    return <BenchmarkReport metrics={anchorReport.metrics} stats={anchorReport.stats} />;
  });

  return (
    <Section id="todo-benchmark" className="page-section fill-screen-section">
      <SectionTitle className={'text-center'}>Anchor vs Classic React</SectionTitle>
      <SectionDescription className="text-center mb-6">
        Both implementations follow the same development patterns with equal effort. The difference in performance comes
        from Anchor's optimized design, not from extreme optimization techniques. As you interact with both versions,
        detailed performance metrics are automatically logged to your browser's console.
      </SectionDescription>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex-1 flex flex-col gap-4">
          <DefaultTodoApp />
          <ClassicReport />
          <RenderStats
            stats={[classicTodoStats.app, classicTodoStats.form, classicTodoStats.list, classicTodoStats.item]}
          />
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <AnchorTodoApp />
          <AnchorReport />
          <RenderStats stats={[todoStats.app, todoStats.form, todoStats.list, todoStats.item]} />
        </div>
      </div>
      <blockquote className="mt-12 text-center max-w-3xl mx-auto text-lg italic text-slate-400 leading-relaxed">
        "A well-engineered app stays performant whether it's displaying one item or thousands. Its performance doesn't
        degrade as it scales."
      </blockquote>
    </Section>
  );
};
