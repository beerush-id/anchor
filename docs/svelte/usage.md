# Usage Guide for Anchor with Svelte

This guide covers more advanced usage patterns for Anchor with Svelte, including global state management, derived values, and integration with Svelte's ecosystem.

## Global State Management

One of the key advantages of Anchor is its ability to create global state that can be shared across multiple components without prop drilling:

```javascript
// lib/store.js
import { anchorRef } from '@anchor/svelte';

// Create global state that can be imported anywhere
export const appState = anchorRef({
  user: null,
  theme: 'light',
  notifications: [],
});

// Helper functions to update state
export const setUser = (user) => {
  appState.value.user = user;
};

export const toggleTheme = () => {
  appState.value.theme = appState.value.theme === 'dark' ? 'light' : 'dark';
};

export const addNotification = (notification) => {
  appState.value.notifications.push({
    id: Date.now(),
    ...notification,
  });
};

export const removeNotification = (id) => {
  appState.value.notifications = appState.value.notifications.filter((n) => n.id !== id);
};
```

```svelte
<!-- components/UserProfile.svelte -->
<script>
  import { appState, setUser } from '../lib/store.js';

  // Use the global state
  const user = $appState.user;

  const login = () => {
    setUser({
      name: 'John Doe',
      email: 'john@example.com'
    });
  };

  const logout = () => {
    setUser(null);
  };
</script>

<div class="user-profile">
  {#if user}
    <p>Welcome, {user.name}!</p>
    <button on:click={logout}>Logout</button>
  {:else}
    <button on:click={login}>Login</button>
  {/if}
</div>
```

```svelte
<!-- components/ThemeToggle.svelte -->
<script>
  import { appState, toggleTheme } from '../lib/store.js';

  // React to theme changes
  const theme = $appState.theme;
</script>

<div class="theme-toggle">
  <span>Current theme: {theme}</span>
  <button on:click={toggleTheme}>
    Switch to {theme === 'dark' ? 'Light' : 'Dark'}
  </button>
</div>
```

## Derived Values and Computed State

Anchor provides powerful tools for creating derived values that automatically update when their dependencies change:

```svelte
<script>
  import { anchorRef, derivedRef, observedRef } from '@anchor/svelte';

  const todos = anchorRef([
    { id: 1, text: 'Learn Svelte', completed: true },
    { id: 2, text: 'Learn Anchor', completed: false },
    { id: 3, text: 'Build an app', completed: false }
  ]);

  // Using derivedRef for simple transformations
  const todoCount = derivedRef(todos, (items) => items.length);
  const completedCount = derivedRef(todos, (items) => items.filter(t => t.completed).length);

  // Using observedRef for more complex computations
  const completionPercentage = observedRef(() => {
    if ($todoCount === 0) return 0;
    return Math.round(($completedCount / $todoCount) * 100);
  });

  const addTodo = (text) => {
    todos.value.push({
      id: Date.now(),
      text,
      completed: false
    });
  };

  const toggleTodo = (id) => {
    const todo = todos.value.find(t => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
    }
  };

  const removeTodo = (id) => {
    todos.value = todos.value.filter(t => t.id !== id);
  };
</script>

<div>
  <h2>Todos ({$completedCount}/{$todoCount} completed - {$completionPercentage}%)</h2>

  <ul>
    {#each $todos as todo (todo.id)}
      <li>
        <input
          type="checkbox"
          checked={todo.completed}
          on:change={() => toggleTodo(todo.id)}
        />
        <span class:completed={todo.completed}>{todo.text}</span>
        <button on:click={() => removeTodo(todo.id)}>Remove</button>
      </li>
    {/each}
  </ul>

  <form on:submit|preventDefault={(e) => {
    const input = e.target.querySelector('input');
    if (input.value.trim()) {
      addTodo(input.value);
      input.value = '';
    }
  }}>
    <input type="text" placeholder="Add a new todo" />
    <button type="submit">Add</button>
  </form>
</div>

<style>
  .completed {
    text-decoration: line-through;
    color: #888;
  }
</style>
```

## Working with Asynchronous Operations

Anchor integrates seamlessly with async operations, making it easy to manage loading states and data fetching:

```svelte
<script>
  import { anchorRef, observedRef } from '@anchor/svelte';

  const apiState = anchorRef({
    data: null,
    loading: false,
    error: null
  });

  const isLoading = observedRef(() => apiState.value.loading);
  const hasError = observedRef(() => !!apiState.value.error);
  const hasData = observedRef(() => !!apiState.value.data);

  const fetchData = async () => {
    apiState.value.loading = true;
    apiState.value.error = null;

    try {
      // Simulate API call
      const response = await new Promise(resolve =>
        setTimeout(() => resolve({ message: 'Data loaded successfully!' }), 1000)
      );

      apiState.value.data = response;
    } catch (error) {
      apiState.value.error = error.message;
    } finally {
      apiState.value.loading = false;
    }
  };

  const clearData = () => {
    apiState.value.data = null;
    apiState.value.error = null;
  };
</script>

<div>
  <button on:click={fetchData} disabled={$isLoading}>
    {$isLoading ? 'Loading...' : 'Fetch Data'}
  </button>

  <button on:click={clearData} disabled={!$hasData}>
    Clear Data
  </button>

  {#if $isLoading}
    <p>Loading data...</p>
  {:else if $hasError}
    <p class="error">Error: {$apiState.error}</p>
  {:else if $hasData}
    <p class="success">{$apiState.data.message}</p>
  {/if}
</div>

<style>
  .error {
    color: red;
  }

  .success {
    color: green;
  }
</style>
```

## Integration with Svelte Stores

You can easily integrate Anchor with Svelte's existing store system:

```svelte
<script>
  import { writable, derived } from 'svelte/store';
  import { anchorRef, observedRef } from '@anchor/svelte';

  // Anchor ref
  const anchorCounter = anchorRef(0);

  // Convert to Svelte store
  const svelteCounter = writable($anchorCounter);

  // Keep them in sync
  anchorCounter.subscribe(value => {
    svelteCounter.set(value);
  });

  // Or create a derived Svelte store from Anchor ref
  const doubledCounter = derived(svelteCounter, $count => $count * 2);

  // Or create an Anchor observed ref from Svelte store
  let svelteValue = 0;
  svelteCounter.subscribe(value => svelteValue = value);
  const tripledCounter = observedRef(() => svelteValue * 3);

  const increment = () => {
    anchorCounter.value++;
  };
</script>

<div>
  <p>Anchor Counter: {$anchorCounter}</p>
  <p>Svelte Counter: {$svelteCounter}</p>
  <p>Doubled (Svelte derived): {$doubledCounter}</p>
  <p>Tripled (Anchor observed): {$tripledCounter}</p>
  <button on:click={increment}>Increment</button>
</div>
```

## Working with Forms and Validation

Here's a more comprehensive example of form handling with validation:

```svelte
<script>
  import { anchorRef, observedRef, exceptionRef } from '@anchor/svelte';
  import { z } from 'zod';

  // Define a schema for validation
  const userSchema = z.object({
    name: z.string().min(1, 'Name is required').max(50, 'Name is too long'),
    email: z.string().email('Invalid email address'),
    age: z.number().min(18, 'Must be at least 18 years old').max(120, 'Invalid age')
  });

  const formState = anchorRef({
    user: {
      name: '',
      email: '',
      age: ''
    },
    submitted: false
  }, userSchema);

  // Capture validation errors
  const formErrors = exceptionRef(formState);

  const isFormValid = observedRef(() => {
    try {
      userSchema.parse($formState.user);
      return true;
    } catch {
      return false;
    }
  });

  const updateField = (field, value) => {
    // Convert age to number if it's the age field
    if (field === 'age') {
      value = value === '' ? '' : Number(value);
    }

    formState.value.user[field] = value;
  };

  const handleSubmit = () => {
    try {
      // Validate the form
      userSchema.parse($formState.user);

      // Process submission
      console.log('Form submitted:', $formState.user);
      formState.value.submitted = true;
    } catch (error) {
      // Errors will be captured by exceptionRef
      console.log('Form validation failed');
    }
  };

  const resetForm = () => {
    formState.value.user = { name: '', email: '', age: '' };
    formState.value.submitted = false;
  };
</script>

{#if $formState.submitted}
  <div>
    <h2>Form Submitted!</h2>
    <p>Name: {$formState.user.name}</p>
    <p>Email: {$formState.user.email}</p>
    <p>Age: {$formState.user.age}</p>
    <button on:click={resetForm}>Submit Another</button>
  </div>
{:else}
  <form on:submit|preventDefault={handleSubmit}>
    <div>
      <label>
        Name:
        <input
          type="text"
          value={$formState.user.name}
          on:input={(e) => updateField('name', e.target.value)}
        />
      </label>
      {#if $formErrors.name}
        <span class="error">{$formErrors.name[0].message}</span>
      {/if}
    </div>

    <div>
      <label>
        Email:
        <input
          type="email"
          value={$formState.user.email}
          on:input={(e) => updateField('email', e.target.value)}
        />
      </label>
      {#if $formErrors.email}
        <span class="error">{$formErrors.email[0].message}</span>
      {/if}
    </div>

    <div>
      <label>
        Age:
        <input
          type="number"
          value={$formState.user.age}
          on:input={(e) => updateField('age', e.target.value)}
        />
      </label>
      {#if $formErrors.age}
        <span class="error">{$formErrors.age[0].message}</span>
      {/if}
    </div>

    <button type="submit" disabled={!$isFormValid}>Submit</button>
    <button type="button" on:click={resetForm}>Reset</button>
  </form>
{/if}

<style>
  .error {
    color: red;
    font-size: 0.8rem;
  }

  form div {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
  }

  input {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
</style>
```

## Performance Optimization Techniques

Here are some techniques to optimize performance with Anchor:

```svelte
<script>
  import { anchorRef, observedRef, derivedRef } from '@anchor/svelte';

  const largeDataSet = anchorRef({
    items: Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random()
    })),
    filter: '',
    sort: 'id'
  });

  // Create specific observers for different parts of the UI
  const filter = observedRef(() => largeDataSet.value.filter);
  const sort = observedRef(() => largeDataSet.value.sort);

  // Derived ref for filtered items - only recomputes when items or filter change
  const filteredItems = derivedRef(largeDataSet, (state) => {
    if (!state.filter) return state.items;
    return state.items.filter(item =>
      item.name.toLowerCase().includes(state.filter.toLowerCase())
    );
  });

  // Derived ref for sorted items - only recomputes when filtered items or sort change
  const sortedItems = derivedRef([filteredItems, sort], ([items, sortField]) => {
    return [...items].sort((a, b) => {
      if (sortField === 'id') return a.id - b.id;
      if (sortField === 'name') return a.name.localeCompare(b.name);
      return a.value - b.value;
    });
  });

  // Paginated items - only recomputes when sorted items or page change
  const currentPage = anchorRef(1);
  const itemsPerPage = 50;

  const paginatedItems = derivedRef([sortedItems, currentPage], ([items, page]) => {
    const start = (page - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  });

  const totalPages = derivedRef(sortedItems, (items) => {
    return Math.ceil(items.length / itemsPerPage);
  });

  const updateFilter = (e) => {
    largeDataSet.value.filter = e.target.value;
    currentPage.value = 1; // Reset to first page when filtering
  };

  const updateSort = (e) => {
    largeDataSet.value.sort = e.target.value;
  };

  const goToPage = (page) => {
    currentPage.value = page;
  };
</script>

<div>
  <div>
    <input
      placeholder="Filter items..."
      value={$filter}
      on:input={updateFilter}
    />

    <select value={$sort} on:change={updateSort}>
      <option value="id">Sort by ID</option>
      <option value="name">Sort by Name</option>
      <option value="value">Sort by Value</option>
    </select>
  </div>

  <ul>
    {#each $paginatedItems as item (item.id)}
      <li>{item.id}: {item.name} ({item.value.toFixed(2)})</li>
    {/each}
  </ul>

  <div>
    <button
      disabled={$currentPage === 1}
      on:click={() => goToPage($currentPage - 1)}
    >
      Previous
    </button>

    <span>Page {$currentPage} of {$totalPages}</span>

    <button
      disabled={$currentPage === $totalPages}
      on:click={() => goToPage($currentPage + 1)}
    >
      Next
    </button>
  </div>
</div>
```

This usage guide demonstrates the power and flexibility of Anchor with Svelte. From simple state management to complex applications with performance optimization, Anchor provides the tools you need to build efficient and maintainable Svelte applications.
