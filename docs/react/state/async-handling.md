---
title: "Async Handling"
description: "Managing asynchronous operations with reactive state."
keywords:
  - async
  - query
  - fetch
  - streaming
---

# Async Handling

Modern applications rely heavily on asynchronous operations. Anchor provides powerful primitives for managing async operations with built-in reactivity, cancellation support, and automatic status tracking.

## The Problem

Traditional async operation handling in JavaScript requires manual orchestration:
- **Status Tracking**: You must manually track loading, success, and error states.
- **Cancellation**: Implementing request cancellation requires boilerplate with AbortController.
- **Race Conditions**: Multiple concurrent requests can overwrite each other's results.
- **Reactivity Gap**: Async results don't automatically trigger UI updates without additional wiring.

## The Solution

Anchor provides complementary approaches for async operations:

1. **`query()`** - For general async operations with full control and cancellation support
2. **`fetchState()`** - For HTTP requests with automatic response handling
3. **`streamState()`** - For streaming responses that update incrementally

All three return reactive state objects that automatically notify your UI when data arrives, errors occur, or status changes.

## Query State

The `query()` function creates a reactive container for any async operation. It's the most flexible option and works with any Promise-returning function.

### Basic Usage

```ts
import { query } from '@anchorlib/react';

// Define an async operation
const userQuery = query(async (signal) => {
  const response = await fetch('/api/user', { signal });
  return response.json();
});

// Access the state
console.log(userQuery.status); // 'pending'
console.log(userQuery.data);   // undefined initially
```

The query automatically starts when created. The state object contains:
- **`data`**: The result of the async operation (initially `undefined`)
- **`status`**: Current status (`'idle'`, `'pending'`, `'success'`, or `'error'`)
- **`error`**: Error object if the operation failed
- **`promise`**: A Promise that resolves when the current operation completes (or a resolved promise if idle)
- **`start()`**: Method to manually trigger the operation
- **`abort()`**: Method to cancel the ongoing operation

### Deferred Execution

By default, queries execute immediately. Use the `deferred` option to control when execution starts:

```ts
const userQuery = query(
  async (signal) => {
    const response = await fetch('/api/user', { signal });
    return response.json();
  },
  undefined,
  { deferred: true }
);

// Later, when ready
userQuery.start();
```

### Cancellation

Every query receives an `AbortSignal` that you can pass to fetch or other cancellable APIs:

```ts
const searchQuery = query(async (signal) => {
  const response = await fetch(`/api/search?q=${term}`, { signal });
  return response.json();
});

// Cancel the request
searchQuery.abort();
```

When aborted, the query's status becomes `'error'` and the error contains the abort reason.

### Initial Data

Provide initial data to avoid `undefined` states:

```ts
const todosQuery = query(
  async (signal) => {
    const response = await fetch('/api/todos', { signal });
    return response.json();
  },
  [] // Initial empty array
);

// Safe to render immediately
console.log(todosQuery.data.length); // 0
```

### Re-fetching

Call `start()` to re-execute the query. If a request is already pending, it will be automatically cancelled:

```ts
const dataQuery = query(async (signal) => {
  const response = await fetch('/api/data', { signal });
  return response.json();
});

// Refresh the data
function refresh() {
  dataQuery.start();
}
```

You can also pass new initial data when re-starting:

```ts
dataQuery.start({ name: 'New Initial Value' });
```

## Fetch State

The `fetchState()` function is specialized for HTTP requests. It wraps the native `fetch` API with reactive state management.

### Basic Usage

```ts
import { fetchState } from '@anchorlib/react';

const userState = fetchState(
  { name: '', email: '' },
  { url: '/api/user' }
);
```

The state object contains the same properties as `query()`, plus:
- **`response`**: The raw Response object from fetch
- **`fetch()`**: Method to trigger or retry the request

### Request Methods

By default, `fetchState` uses GET. Specify other methods explicitly:

```ts
// POST request with body
const createUser = fetchState(
  null,
  {
    url: '/api/users',
    method: 'POST',
    body: { name: 'John', email: 'john@example.com' }
  }
);

// PUT request
const updateUser = fetchState(
  null,
  {
    url: '/api/users/123',
    method: 'PUT',
    body: { name: 'Jane' }
  }
);
```

### Dynamic Requests

Use the `fetch()` method to make requests with different parameters:

```ts
const userState = fetchState(
  null,
  { url: '/api/user', deferred: true }
);

// Fetch with custom options
userState.fetch({
  url: '/api/user/123',
  headers: { 'Authorization': 'Bearer token' }
});
```

### Response Handling

`fetchState` automatically parses JSON responses based on the `Content-Type` header:

```ts
const dataState = fetchState({}, { url: '/api/data' });

// When response arrives with 'application/json'
// dataState.data will contain the parsed object
```

For non-JSON responses, `data` contains the raw text.

## Stream State

The `streamState()` function handles streaming responses that arrive in chunks, perfect for Server-Sent Events or streaming APIs.

### Basic Usage

```ts
import { streamState } from '@anchorlib/react';

const chatStream = streamState(
  '',
  { url: '/api/chat/stream' }
);

// Data updates incrementally as chunks arrive
console.log(chatStream.data); // Grows over time
```

### Transform Function

Control how chunks are combined using the `transform` option:

```ts
const logStream = streamState(
  [],
  {
    url: '/api/logs/stream',
    transform: (current, chunk) => {
      // Append new chunk to array
      return [...current, chunk];
    }
  }
);
```

By default, the transform behavior depends on the data type:
- **Strings**: Concatenated
- **Objects**: Merged using `anchor.assign`
- **Arrays**: Elements pushed

### Streaming to ReadableStream

Create a ReadableStream from reactive state:

```ts
import { streamState } from '@anchorlib/react';

const [state, stream] = streamState.readable('');

// Pipe the stream to a response
return new Response(stream);

// Update the state to emit chunks
state.data = 'Hello ';
state.data += 'World';
state.status = 'success'; // Closes the stream
```

## Status Management

All async state objects use a consistent status lifecycle:

```ts
type FetchStatus = 'idle' | 'pending' | 'success' | 'error';
```

- **`idle`**: Initial state when using `deferred: true`
- **`pending`**: Operation in progress
- **`success`**: Operation completed successfully
- **`error`**: Operation failed or was aborted

### Reactive Status

Because status is reactive, your UI automatically updates:

```tsx
import { setup, query } from '@anchorlib/react';

export const UserProfile = setup(() => {
  const user = query(async (signal) => {
    const res = await fetch('/api/user', { signal });
    return res.json();
  });

  return (
    <div>
      {user.status === 'pending' && <p>Loading...</p>}
      {user.status === 'error' && <p>Error: {user.error?.message}</p>}
      {user.status === 'success' && <p>Hello, {user.data.name}!</p>}
    </div>
  );
});
```

## Converting to Promises

All async state functions expose a `.promise` property that returns a Promise for use with async/await:

```ts
import { query, fetchState, streamState } from '@anchorlib/react';

// query() with .promise property
const userQuery = query(async (signal) => {
  const res = await fetch('/api/user', { signal });
  return res.json();
});

await userQuery.promise;
console.log('User loaded:', userQuery.data);

// fetchState() with .promise property
const dataState = fetchState({}, { url: '/api/data' });
await dataState.promise;
console.log('Data loaded:', dataState.data);

// streamState() with .promise property
const streamData = streamState('', { url: '/api/stream' });
await streamData.promise;
console.log('Stream complete:', streamData.data);
```

The `promise` property is a getter that:
- Returns the **active promise** if an operation is currently running
- Returns `Promise.resolve(undefined)` if no operation is active (idle state)
- Allows seamless integration with async/await patterns

This is useful for:
- Server-side rendering where you need to wait for data
- Sequential operations that depend on previous results
- Integration with existing Promise-based code

## Best Practices

### Use Initial Data to Avoid Undefined States

Provide initial data that matches your expected structure. This eliminates the need for optional chaining and makes your code more predictable.

```ts
// ✅ Safe to access immediately
const todos = query(
  async (signal) => {
    const res = await fetch('/api/todos', { signal });
    return res.json();
  },
  [] // Initial empty array
);

// No need for optional chaining
console.log(todos.data.length); // Always works

// ❌ Requires defensive checks
const user = query(async (signal) => {
  const res = await fetch('/api/user', { signal });
  return res.json();
});

console.log(user.data?.name); // Need optional chaining
```

### Leverage Automatic Cancellation

When you call `start()` on a pending query, it automatically cancels the previous request. Use `effect()` to automatically re-fetch when dependencies change.

```ts
const term = mutable('');
const search = query(
  async (signal) => {
    const res = await fetch(`/api/search?q=${term.value}`, { signal });
    return res.json();
  },
  [],
  { deferred: true }
);

// Automatically re-fetch when term changes
effect(() => {
  if (term.value) {
    search.start(); // Cancels previous request automatically
  }
});

// Just update the term, effect handles the rest
term.value = 'new query';
```

The query automatically cancels pending requests when `start()` is called again. Combined with `effect()`, you get automatic search-as-you-type with built-in cancellation.

### Direct Mutation of Async State

Because async state objects are mutable, you can update them directly when needed:

```ts
const dataQuery = query(fetchData, { items: [] });

// Direct mutation works
dataQuery.data.items.push(newItem);

// Update nested properties
dataQuery.data.items[0].name = 'Updated';

// All mutations trigger fine-grained UI updates
```

This is particularly useful when you need to optimistically update the UI before a mutation completes.

### Combine Queries with Computed Properties

Use JavaScript getters to derive values from async state:

```ts
const store = mutable({
  usersQuery: query(fetchUsers, []),
  postsQuery: query(fetchPosts, []),
  
  // Automatically recomputes when either query updates
  get isLoading() {
    return this.usersQuery.status === 'pending' || 
           this.postsQuery.status === 'pending';
  },
  
  get hasErrors() {
    return this.usersQuery.status === 'error' || 
           this.postsQuery.status === 'error';
  },
  
  get allData() {
    return {
      users: this.usersQuery.data,
      posts: this.postsQuery.data
    };
  }
});
```

These getters are automatically reactive—no dependency arrays needed.

### Parallel Queries for Independent Data

Start independent queries simultaneously to avoid request waterfalls:

```ts
export const Dashboard = setup(() => {
  const store = mutable({
    // All three start immediately in parallel
    user: query(fetchUser),
    stats: query(fetchStats),
    notifications: query(fetchNotifications),
    
    get isReady() {
      return this.user.status === 'success' &&
             this.stats.status === 'success' &&
             this.notifications.status === 'success';
    }
  });
  
  return render(() => (
    <div>
      {store.isReady ? <Content data={store} /> : <Loading />}
    </div>
  ));
});
```

### Sequential Queries with Dependencies

When one query depends on another, use `effect()` or direct function calls:

```ts
const store = mutable({
  userId: 1,
  userQuery: query(
    async (signal) => {
      const res = await fetch(`/api/users/${store.userId}`, { signal });
      return res.json();
    },
    null,
    { deferred: true }
  ),
  postsQuery: query(fetchPosts, [], { deferred: true }),
  
  async loadUserAndPosts() {
    // Sequential: wait for user first
    await this.userQuery.promise;
    
    // Then load posts with user ID
    if (this.userQuery.status === 'success') {
      this.postsQuery.start();
    }
  }
});

// Or use effect for automatic re-fetching
effect(() => {
  if (store.userQuery.status === 'success') {
    store.postsQuery.start();
  }
});
```

## Choosing an Approach

| Feature | `query()` | `fetchState()` | `streamState()` |
| :--- | :--- | :--- | :--- |
| **Use Case** | General async operations | HTTP requests | Streaming responses |
| **Cancellation** | Built-in via AbortSignal | Built-in | Built-in |
| **Response Parsing** | Manual | Automatic JSON detection | Incremental chunks |
| **Flexibility** | Highest | Medium | Specialized |
| **Best For** | Custom async logic, non-HTTP operations | REST APIs, simple requests | SSE, chat, logs |
