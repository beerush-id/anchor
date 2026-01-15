# **Query API**

The Query API provides a generic reactive state management for any asynchronous operation. While `fetchState` is specialized for HTTP requests, `query` can be used with any Promise-based async function.

It is designed to handle common async patterns like:
- **Loading States**: Automatically tracks `idle`, `pending`, `success`, and `error` statuses.
- **Race Conditions**: Automatically cancels previous pending requests when a new one starts.
- **Cancellation**: Provides an `abort()` method and passes an `AbortSignal` to your function.
- **Reactivity**: The state object is deeply reactive.

## **`query`**

Creates a reactive state container for managing asynchronous operations with built-in cancellation support.

### **Type Signature**

```typescript
function query<T extends Linkable, E extends Error = Error>(
  fn: AsyncHandler<T>,
  init?: T,
  options?: AsyncOptions
): AsyncState<T, E>;
```

### **Parameters**

- **`fn`** - An async function that performs the operation. It receives an `AbortSignal` for cancellation handling.
- **`init`** - (Optional) Initial data value.
- **`options`** - (Optional) Configuration options.

### **Options**

- **`deferred`** - (boolean) If `true`, the operation won't start automatically. Defaults to `false`.

### **Return Value**

Returns an immutable `AsyncState` object with the following properties:

- **`data`** - The current data value. It is wrapped in a `mutable` proxy, making it deeply reactive.
- **`status`** - The current status: `'idle' | 'pending' | 'success' | 'error'`.
- **`error`** - The error object if the operation failed.
- **`promise`** - A getter that returns the current active Promise. You can await this to wait for the operation to complete.
- **`start(newInit?)`** - Function to start (or restart) the operation.
    - If called while an operation is pending, the previous operation is automatically aborted.
    - Accepts an optional `newInit` argument to update `data` immediately before the operation starts (useful for optimistic updates).
- **`abort(reason?)`** - Function to cancel the ongoing operation.

### **Usage**

#### **Basic Query**

```typescript
import { query, subscribe } from '@anchorlib/core';

// 1. Define your async function
// The function receives an AbortSignal to support cancellation
const fetchStats = async (signal: AbortSignal) => {
  const response = await fetch('/api/stats', { signal });
  if (!response.ok) throw new Error('Failed to fetch stats');
  return response.json();
};

// 2. Create the query state
// It starts automatically unless { deferred: true } is passed
const stats = query(fetchStats, { count: 0 });

// 3. Use the state
subscribe(stats, (state) => {
  if (state.status === 'pending') {
    console.log('Loading...');
  } else if (state.status === 'success') {
    console.log('Stats:', state.data);
  } else if (state.status === 'error') {
    console.error('Error:', state.error);
  }
});
```

#### **Manual Execution & Optimistic Updates**

You can use `deferred: true` to prevent auto-execution, and use `start(optimisticData)` to update the UI immediately.

```typescript
const search = query(
  async (signal) => {
    // ... search logic
  },
  [], 
  { deferred: true }
);

// Search is idle initially
console.log(search.status); // 'idle'

// Start search with optimistic data (optional)
search.start([{ id: 0, name: 'Skeleton Item' }]);
```

#### **Handling Cancellation**

The `query` function automatically handles cancellation if you run `start()` again while a request is pending. You can also manually call `abort()`.

```typescript
const myQuery = query(async (signal) => {
  // Pass signal to fetch or other async APIs
  const res = await fetch('/data', { signal });
  return res.json();
});

// Start request
myQuery.start();

// Cancel request
myQuery.abort('User cancelled');
```

#### **Awaiting the Result**

You can await the `promise` property to work with standard async/await flows.

```typescript
try {
  await myQuery.promise;
  console.log('Finished!', myQuery.data);
} catch (err) {
  console.error('Failed', err);
}
```

## **`cancelable`**

A helper utility to create a cancelable promise from a function that accepts an `AbortSignal`. This is useful if you want to build your own async logic outside of `query` but need cancellation support.

### **Type Signature**

```typescript
function cancelable<R>(
  fn: (signal: AbortSignal) => Promise<R> | R,
  signal: AbortSignal
): Promise<R>;
```

### **Usage**

```typescript
import { cancelable } from '@anchorlib/core';

const controller = new AbortController();

const promise = cancelable(async (signal) => {
  // Your async logic here
  await new Promise(r => setTimeout(r, 1000));
  
  if (signal.aborted) throw new Error('Aborted');
  
  return 'Done';
}, controller.signal);

// Cancel it
controller.abort();
```
