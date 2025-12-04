import type { Row, RowListState } from '@anchorlib/storage/db';
import { type Todo, type TodoRec, todoStats, todoTable } from './todos';

export const todoActions = {
  // Handle adding a new todo item.
  add(list: RowListState<Row<Todo>>, text: string) {
    // Create new todo item.
    const newItem = todoTable.add({ text, completed: false });

    // Push the new todo to the list.
    list.data.push(newItem.data);

    // Update the stats.
    todoStats.data.total++;
    todoStats.data.pending++;
  },
  // Handle toggling a todo item.
  toggle(todo: TodoRec) {
    const stats = todoStats.data;

    // Toggle the completed state of the todo.
    todo.completed = !todo.completed;

    // Update the stats.
    if (todo.completed) {
      stats.completed++;
      stats.pending--;
    } else {
      stats.completed--;
      stats.pending++;
    }
  },
  // Handle removing a todo item.
  remove(todo: TodoRec) {
    const stats = todoStats.data;

    // Delete the todo.
    todoTable.remove(todo.id);

    // Update the total count.
    stats.total--;

    // Update the completed count.
    if (todo.completed) {
      stats.completed--;
    } else {
      stats.pending--;
    }
  },
};
