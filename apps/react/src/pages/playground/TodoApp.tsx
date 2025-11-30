import { setup, useAnchor, view } from '@anchorlib/react-classic';
import type { FormEventHandler } from 'react';

type Todo = {
  id: number;
  text: string;
  completed: boolean;
};

const TodoApp = setup(() => {
  const [state] = useAnchor({
    newText: '',
    todos: [
      {
        id: 1,
        text: 'Learn React',
        completed: false,
      },
      {
        id: 2,
        text: 'Learn Anchor',
        completed: false,
      },
    ] as Todo[],
  });

  const handleSubmit: FormEventHandler = (e) => {
    e.preventDefault();

    // Add todo.
    state.todos.push({
      id: state.todos.length + 1,
      text: state.newText,
      completed: false,
    });

    // Reset input.
    state.newText = '';
  };

  const TodoForm = view(
    () => (
      <form onSubmit={handleSubmit}>
        <input placeholder="Todo text" value={state.newText} onChange={(e) => (state.newText = e.target.value)} />
      </form>
    ),
    'TodoForm'
  );

  const TodoList = view(
    () => (
      <ul className="pl-4 list-disc">
        {state.todos.map((item) => {
          return <TodoItem key={item.id} todo={item} />;
        })}
      </ul>
    ),
    'TodoList'
  );

  const handleToggle = (todo: Todo) => {
    todo.completed = !todo.completed;
  };

  const TodoItem = view<{ todo: Todo }>(
    ({ todo }) => (
      <li className={todo.completed ? 'text-green-800' : ''}>
        <button onClick={() => handleToggle(todo)}>{todo.text}</button>
      </li>
    ),
    'TodoItem'
  );

  const handlerClear = () => {
    state.todos.length = 0;
  };

  return (
    <div>
      <h1>Todo App</h1>
      <TodoForm />
      <TodoList />
      <button onClick={handlerClear}>Clear</button>
    </div>
  );
}, 'TodoApp');

export default TodoApp;
