'use client';

import { memo } from 'react';
import { Section, SectionDescription, SectionTitle } from '@anchorlib/react-kit/components';

import { classicTodoStats, todoStats } from '@utils/stats';
import { RenderStats } from '@components/stats/RenderStats';
import { ClassicTodoApp } from '@components/todo-classic/ClassicTodoApp';
import { TodoApp } from '@components/todo/TodoApp';

const AnchorTodoApp = memo(TodoApp);
const DefaultTodoApp = memo(ClassicTodoApp);

export const TodoDemo = () => {
  return (
    <Section id="todo-benchmark" className="page-section fill-screen-section">
      <SectionTitle>Try It Yourself: FLOOD THE DOM!</SectionTitle>
      <SectionDescription className="text-center">
        This demo is built with profiling enabled, allowing you to use React DevTools to analyze performance as it
        scales. It highlights how the same complexity effort can lead to vastly different performance outcomes, powered
        by Anchor.
      </SectionDescription>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex-1 flex flex-col gap-4">
          <DefaultTodoApp />
          <RenderStats
            stats={[classicTodoStats.app, classicTodoStats.form, classicTodoStats.list, classicTodoStats.item]}
          />
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
  );
};
