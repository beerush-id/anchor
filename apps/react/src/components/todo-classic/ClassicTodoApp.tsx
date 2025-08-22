import { type FC, useRef, useState } from 'react';
import { Card } from '../Card.js';
import { CardHeader } from '../CardHeader.js';
import { type ITodoItem } from '../../lib/todo.js';
import { ClassicTodoForm } from './ClassicTodoForm.js';
import { ClassicTodoList } from './ClassicTodoList.js';
import { classicTodoStats, flashNode, useUpdateStat } from '../stats/stats.js';
import { CodeBlock } from '../CodeBlock.js';
import { shortId } from '@anchor/core';
import { ClassicTodoCode } from './ClassicTodoCode.js';

export const ClassicTodoApp: FC = () => {
  const [panel, setPanel] = useState({ info: false, code: false });
  const [todos, setTodos] = useState([
    { id: shortId(), text: 'Master React state', completed: true },
    { id: shortId(), text: 'Try Anchor', completed: false },
  ]);

  const handleOnAdd = (todo: ITodoItem) => {
    setTodos([...todos, todo]);
  };

  const handleToggle = (id: string) => {
    setTodos(todos.map((todo) => (todo.id === id ? { ...todo, completed: !todo.completed } : todo)));
  };

  const handleRemove = (id: string) => {
    setTodos(todos.filter((todo) => todo.id !== id));
  };

  const toggleInfo = () => {
    setPanel((current) => ({ ...current, info: !current.info }));
  };

  const toggleCode = () => {
    setPanel((current) => ({ ...current, code: !current.code }));
  };

  useUpdateStat(() => {
    classicTodoStats.app.value++;
  });

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-slate-200 flex-1">👌Classic Todo List</h3>
        <ClassicTodoPanel panel={panel} toggleInfo={toggleInfo} toggleCode={toggleCode} />
      </CardHeader>
      <ClassicInfoPanel panel={panel} />
      <div className="p-4">
        <ClassicTodoForm onAdd={handleOnAdd} />
        <ClassicTodoList todos={todos} onToggle={handleToggle} onRemove={handleRemove} />
      </div>
      <ClassicCodePanel panel={panel} />
    </Card>
  );
};

const ClassicTodoPanel: FC<{
  panel: { info: boolean; code: boolean };
  toggleInfo: () => void;
  toggleCode: () => void;
}> = ({ panel, toggleInfo, toggleCode }) => {
  const ref = useRef(null);

  flashNode(ref.current);

  return (
    <div ref={ref} className="flex items-center">
      <button
        onClick={toggleInfo}
        className="hover:text-slate-200 hover:border-slate-200 rounded-full w-4 h-4 border border-slate-400 text-xs text-slate-400 inline-flex items-center justify-center mr-4">
        i
      </button>
      <button className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium" onClick={toggleCode}>
        {panel.code ? 'Hide Code' : 'Show Code'}
      </button>
    </div>
  );
};

const ClassicInfoPanel: FC<{ panel: { info: boolean } }> = ({ panel }) => {
  const ref = useRef(null);

  flashNode(ref.current);

  return (
    <div ref={ref} className="text-sm text-slate-400">
      {panel.info && (
        <p className="px-4 pt-4">
          While it works, it's not very efficient because everything re-renders on changes. Component splitting also
          harder to maintain due to prop drilling effect (passing down the state controller).
        </p>
      )}
    </div>
  );
};

const ClassicCodePanel: FC<{ panel: { code: boolean } }> = ({ panel }) => {
  const ref = useRef(null);

  flashNode(ref.current);

  return (
    <div ref={ref} className="bg-slate-950">
      {!panel.code && (
        <CodeBlock
          code={`const TodoItem = ({ item, onToggle }) => {
  const handleChange = () => {
    onToggle(item);
  };
};`}
        />
      )}
      {panel.code && <ClassicTodoCode />}
    </div>
  );
};
