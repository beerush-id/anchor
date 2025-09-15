import { useEffect, useState } from 'react';
import { useAnchor, useVariable } from '@anchorlib/react';
import { observe } from '@anchorlib/react/view';

function computeExpensiveValue() {
  return Math.random();
}

function TraditionalComponent() {
  // When the count changes, the whole component re-renders.
  const [count, setCount] = useState(0);

  // Always 0 because it's re-declared on each render.
  let renderCount = 0;

  // Expensive computation always run on each render.
  const expensiveValue = computeExpensiveValue();

  useEffect(() => {
    setInterval(() => {
      // Always starts from 0 because count is a stale closure value.
      setCount(count + 1);

      // The view always shows 0 because it's updating the stale closure variable.
      renderCount++;
    }, 1000);
  }, []);

  return (
    <div className="w-full max-w-md mx-auto">
      <p>Count: {count}</p>
      <p>Render Count: {renderCount}</p>
      <p>Expensive Value: {expensiveValue}</p>
    </div>
  );
}

// State Component - Renders only once.
const CounterManager = () => {
  // Data - reactive state that holds your application data.
  const [count] = useVariable(0);

  // This variable is stable because the CounterManager itself doesn't re-render.
  let renderCount = 0;

  // Expensive computation only runs once.
  const expensiveValue = computeExpensiveValue();

  // View - only re-renders when the observed data changes.
  const Counter = observe(() => {
    // Assigning to local variable works as normally would.
    renderCount++;

    return (
      <>
        <h1>Count: {count.value}</h1>
        <p>Render Count: {renderCount}</p>
        <p>Expensive Value: {expensiveValue}</p>
      </>
    );
  });

  useEffect(() => {
    setInterval(() => {
      count.value++;
    }, 1000);
  }, []);

  // Mutation - Directly mutates the reactive state.
  const reset = () => {
    count.value = 0;
    renderCount = 0;
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <Counter />
      <button className="font-semibold bg-blue-500 px-2 py-1" onClick={reset}>
        Reset
      </button>
    </div>
  );
};

const UserDashboard = () => {
  const [user] = useAnchor({ name: 'John Doe', age: 30 });

  // Only re-renders when user.name changes
  const UserName = observe(() => {
    return <h1>Hello, {user.name}!</h1>;
  });

  // Only re-renders when user.age changes
  const UserAge = observe(() => {
    return <p>You are {user.age} years old</p>;
  });

  return (
    <div className="w-full max-w-md mx-auto">
      {/* These views are independent and render separately */}
      <UserName />
      <UserAge />

      <div className="flex items-center gap-2">
        <button className="font-semibold bg-blue-500 px-2 py-1" onClick={() => (user.name = 'Jane Doe')}>
          Change Name
        </button>
        <button className="font-semibold bg-blue-500 px-2 py-1" onClick={() => user.age++}>
          Increment Age
        </button>
      </div>
    </div>
  );
};

const TaskManager = () => {
  const [tasks] = useAnchor<{ id: number; text: string; completed: boolean }[]>([]);

  let localCounter = 0; // This remains stable!

  // These functions are never re-created unnecessarily
  const addTask = (text: string) => {
    tasks.push({ id: Date.now(), text, completed: false });
    localCounter++; // This works as expected!
  };

  const TaskListView = observe(() => (
    <div>
      <ul className="list-disc flex flex-col w-full">
        {tasks.map((task) => (
          <li key={task.id}>{task.text}</li>
        ))}
      </ul>
      <span>{localCounter} Tasks</span>
    </div>
  ));

  return (
    <div className="w-full max-w-md mx-auto">
      <TaskListView />
      <button className="font-semibold bg-blue-500 px-2 py-1" onClick={() => addTask(`New Task ${tasks.length + 1}`)}>
        Add Task
      </button>
    </div>
  );
};

export default function Playground() {
  return (
    <div className="w-full min-h-screen flex flex-col items-center justify-center gap-6">
      <TraditionalComponent />
      <CounterManager />
      <UserDashboard />
      <TaskManager />
    </div>
  );
}
