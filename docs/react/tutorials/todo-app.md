# Persistent Todo App in React with Anchor

Learn how to build a scalable, persistent todo app in React using Anchor as the State Management.

::: warning IMPORTANT

This tutorial is designed to help you build a scalable application that maintains consistent performance whether
displaying **3** todos or **`1,000`** todos.

**Note**: Learning to build scalable applications from the start is crucial. Without this foundation, you'll face
significant challenges when working on complex projects.

:::

## What You'll Learn?

In this tutorial, you will learn:

- **State architecture** - How to structure your state to build a scalable app.
- **Logic distribution** - How to distribute logic to the relevant components.
- **Component splitting** - How to split your components into smaller components.
- **Selective rendering** - How to render components based on certain conditions.
- **Persistent Storage** - How to persist your data using Anchor's storage library.

## Application Structure

Let's start with creating the data structure that we will need for our Todo App.

### Data (**`D`** in **`DSV`**)

To build a Todo App, we will need the following data:

#### Todo

- **`id`** _(string)_ - Unique identifier for each todo.
- **`text`** _(string)_ - Text of the todo.
- **`completed`** _(boolean)_ - Whether the todo is completed or not.

#### Todo List

- **`todos`** _(array)_ - Array of todos.

#### Todo Stats

- **`total`** _(number)_ - Total number of todos.
- **`completed`** _(number)_ - Total number of completed todos.
- **`pending`** _(number)_ - Total number of pending todos.

::: tip Why Todo Stats?

A scalable application should avoid relying on heavy computations to calculate statistics. This ensures that regardless
of whether you have 3 or 1,000 todos, the app remains fast and responsive. To achieve this, we use a dedicated stats
data structure to hold the statistics and update them in atomic operations.

**Note**: While this approach might seem more complex or even overkill at first, it's a best practice for building
scalable applications. You'll appreciate this design decision as your app grows beyond just a few todos.

:::

### States (**`S`** in **`DSV`**)

Since we will persist the data, we will need a way to store the data. We will use Anchor's storage library to store the
data.

- **`todoTable`** _(object)_ - Anchor's table that will bridge operation to store the data in IndexedDB.
- **`todoStats`** _(object)_ - Anchor's KV (key-value) store that will bridge operation to store the data in IndexedDB.

### Components (**V** in DSV)

- **`TodoItem`** - Component that renders a single todo.
- **`TodoList`** - Component that renders a list of todos.
- **`TodoStats`** - Component that renders the stats.
- **`TodoForm`** - Component that renders the form to add a todo, or edit a todo.
- **`App`** - The main component that renders the app.

## Implementation

Let's start by creating the data structure.

::: code-group

<<< @/react/tutorials/todo-app/todos.ts

:::

::: tip What we have done here?

- ✓ We created a table for todos.
- ✓ We seeded the table with initial data.
- ✓ We created a key-value store for todo stats.

:::

Then let's create the mutators, a set of handlers that will be used to manage the todos and stats.

::: code-group

<<< @/react/tutorials/todo-app/actions.ts

:::

::: tip What we have done here?

- ✓ We created a set of handlers that will be used to manage the todos.
- ✓ We created a set of handlers that will be used to manage the stats.

:::

Now let's create the components. Let's start with the `TodoItem` component.

::: code-group

<<< @/react/tutorials/todo-app/TodoItem.tsx

:::

::: tip What we have done here?

- ✓ We created a component that renders a **single todo**.
- ✓ We created a view for the todo item, since only these elements that need to be **re-rendered**.
- ✓ We created a **toggle** handler that handles toggling the completed status and update the stats.
- ✓ We created a **delete** handler that handles deleting a todo and update the stats.
- ✓ We created an **edit** handler that handles editing the todo text with a simple syntax.
- ✓ We created an observer using `useObservedRef()` that observes the search term to hide itself if the text doesn't
  match the search term. It re-renders only when the variable is actually changes (`false` to `true` or `true` to
  `false`).
- ✓ We only display the todo item if it's not deleted by checking the `deleted_at` property.
- ✓ We used `observe()` **HOC** to selectively render partial elements.
- ✓ We **memoized** the component to prevent re-render when the todo list is updated.

:::

::: code-group

<<< @/react/tutorials/todo-app/TodoList.tsx

:::

::: tip What we have done here?

- ✓ We created a view to render the list of todos.
- ✓ We used `useObserver()` hook to observe the query status.
- ✓ We used `useObserver()` hook to observe the todo list length. This make sure the observer is reacting to `push`
  event.

:::

::: code-group

<<< @/react/tutorials/todo-app/TodoStats.tsx

:::

::: tip What we have done here?

- ✓ We created a view to render the stats.
- ✓ We used `observer()` **HOC** to observe the stats.

:::

::: code-group

<<< @/react/tutorials/todo-app/TodoForm.tsx

:::

::: tip What we have done here?

- ✓ We created a view to render the form to add a todo.
- ✓ We used `observer()` **HOC** to observe the form.
- ✓ We created a submit handler that adds a todo to the list and update the stats.

:::

::: code-group

<<< @/react/tutorials/todo-app/App.tsx

:::

::: tip What we have done here?

- ✓ We created a view to render the app.
- ✓ We don't use any observation due to the component is not displaying any data directly.
- ✓ We created a state to query the list of todos.
- ✓ We created a search state and register it to the global context.
- ✓ We created a simple search input that only re-render itself.

:::

## Preview

After we have created the components, let's put them together in the app.

::: anchor-react-sandbox {class="preview-flex"}

<<< @/react/tutorials/todo-app/App.tsx [active]

<<< @/react/tutorials/todo-app/TodoForm.tsx

<<< @/react/tutorials/todo-app/TodoList.tsx

<<< @/react/tutorials/todo-app/TodoStats.tsx

<<< @/react/tutorials/todo-app/TodoItem.tsx

<<< @/react/tutorials/todo-app/todos.ts

<<< @/react/tutorials/todo-app/actions.ts

:::

## Conclusion

In this tutorial, we have learned how to build a Todo App using React and Anchor. We have learned how to structure our
state, component, and selectively render components. We have also learned how to persist our data using Anchor's storage
library.

### Optimization Achievements

- ✓ Utilized `observe()` **HOC** for selective rendering of partial elements, enhancing performance.
- ✓ Employed `observe()` **HOC** to conditionally display/hide todo items based on the `deleted_at` property. This
  significantly
  reduces computational overhead for list filtering and prevents unnecessary re-renders of the parent component when an
  item is deleted.
- ✓ We reduced the heavy computation to calculate the stats by using a dedicated `stats` data.
- ✓ We used `memo()` **HOC** to prevent re-render todo item when the todo list is updated.
- ✓ No boilerplate code. Those `debugRender` code is simply a debug tool for this tutorial, so we can see which
  component that is being re-rendered.

### Logic Distribution

- The **App** job is only to query the list of todos and distribute it to the components that need it.
- The **TodoForm** is responsible for adding new todos and updating the statistics.
- The **TodoItem** handles updating a todo's status (e.g., `completed` or `deleted`) and subsequently updating the
  statistics.

::: tip Why distribute the logic?

In traditional React applications, all logic is typically handled in the parent component (**`centralized`** approach).
As the application grows, this makes maintenance increasingly difficult because the parent component accumulates too
much responsibility. It's like being a boss who hires workers but ends up doing all the work yourself, while your team
just tells you what needs to be done.

The **`decentralized`** approach distributes logic to the components that actually need it. This makes the application
much easier to maintain, as each component is responsible for its own specific logic. Think of it as being a boss who
hires skilled workers and trusts them to do their respective jobs effectively.

:::

### Render Performance

- The **App** component is rendered only **once**.
- The **TodoForm** component re-renders exclusively when there's **activity within the form** (e.g., typing,
  submission).
- The **TodoList** component re-renders only when a new item is **added**.
- The **TodoStats** component re-renders solely when there's a change in its underlying state.
- The **TodoItem** component has two types of rendering:
  - The **TodoItemView** re-renders when the todo's status (`completed`) changes.
  - The **TodoItemBody** re-renders only when the deletion status (`deleted_at`) changes.
  - The **TodoItem** component itself renders only once, ensuring that all its internal functions and state are created
    just once and remain stable throughout its lifecycle.
