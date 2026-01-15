# **Fetch API**

The fetch API provides reactive state management for HTTP requests. It wraps the standard **`fetch`** API with Anchor's
reactivity system, making it easy to handle loading states, errors, and data updates.

::: tip Optimistic Model

The fetch API uses an **optimistic model** where the initial state is used to display loading states. This means that the
initial state is displayed while the request is pending. It's also useful to build a skeleton UI before the request completes.

:::

## **`fetchState`**

Create a reactive fetch state object that automatically updates as the HTTP request progresses.

### **Type Signature**

```ts
type fetchState = <T, S extends LinkableSchema = LinkableSchema>(init: T, options: FetchOptions<S>) => FetchState<T>;
```

### **Parameters**

- **`init`** - The initial data value for the state
- **`options`** - Configuration options including URL and standard **`RequestInit`** parameters

### **Return Value**

Returns a reactive **`FetchState`** object with the following properties:

- **`data`** - The fetched data (initially the provided initial value)
- **`status`** - Current request status (`idle`, `pending`, `success`, or `error`)
- **`error`** - Error object if the request failed
- **`response`** - Raw Response object from the fetch API
- **`fetch(options?)`** - Function to manually start or restart the request
- **`abort()`** - Function to cancel the current request

### **Options**

The options object extends the standard **`RequestInit`** interface and includes:

- **`url`** - The URL to fetch (string or URL object)
- All standard **`RequestInit`** properties like method, headers, body, etc.

### **Usage**

```typescript
import { fetchState, subscribe } from '@anchorlib/core';

// Create a reactive fetch state
const userState = fetchState(
  null, // Initial data
  {
    url: 'https://api.example.com/users/1',
    method: 'GET',
    headers: {
      Authorization: 'Bearer token',
    },
  }
);

// Subscribe to state changes
subscribe(userState, (state) => {
  switch (state.status) {
    case 'pending':
      console.log('Loading...');
      break;
    case 'success':
      console.log('User data:', state.data);
      break;
    case 'error':
      console.error('Error:', state.error);
      break;
  }
});
```

## **`fetchState.promise`**

Convert a fetch state object to a Promise for traditional async/await usage.

### **Type Signature**

```ts
type promise = <T, S extends FetchState<T>>(state: S) => Promise<S>;
```

### **Parameters**

- **`state`** - A fetch state object created by [fetchState]

### **Return Value**

Returns a Promise that resolves with the final state when the request succeeds, or rejects with the error when the
request fails.

### **Usage**

```typescript
import { fetchState } from '@anchorlib/core';

const userState = fetchState(null, { url: '/api/users/1' });

try {
  const finalState = await fetchState.promise(userState);
  console.log('User data:', finalState.data);
} catch (error) {
  console.error('Request failed:', error);
}
```

## **FetchStatus Enum**

The **`FetchStatus`** enum defines the possible states of a fetch request:

- **`Idle`** - Initial state when `deferred` option is true
- **`Pending`** - Request has been initiated but not yet completed
- **`Success`** - Request completed successfully
- **`Error`** - Request failed with an error

## **Examples**

### **Fetching JSON Data**

```typescript
import { fetchState } from '@anchorlib/core';

interface User {
  id: number;
  name: string;
  email: string;
}

const userState = fetchState<User | null>(null, {
  url: '/api/users/1',
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Using with subscription to react to state changes
subscribe(userState, (state) => {
  if (state.status === 'success' && state.data) {
    document.getElementById('user-name')!.textContent = state.data.name;
  }
});
```

### **Posting Data**

```typescript
import { fetchState } from '@anchorlib/core';

interface User {
  id: number;
  name: string;
  email: string;
}

const createUserState = fetchState<User | null>(null, {
  url: '/api/users',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
  }),
});
```

### **Error Handling**

```typescript
import { fetchState, subscribe } from '@anchorlib/core';

const dataState = fetchState([], { url: '/api/data' });

subscribe(dataState, (state) => {
  switch (state.status) {
    case 'pending':
      showLoadingIndicator();
      break;
    case 'success':
      hideLoadingIndicator();
      renderData(state.data);
      break;
    case 'error':
      hideLoadingIndicator();
      showError(state.error?.message || 'An error occurred');
      break;
  }
});
```

## **Best Practices**

### **1. Always Handle All Status States**

Make sure to handle all possible status states in your UI to provide a good user experience:

```typescript
import { fetchState, subscribe } from '@anchorlib/core';

const state = fetchState([], { url: '/api/data' });

subscribe(state, (state) => {
  switch (state.status) {
    case 'pending':
      // Show loading indicator
      showSpinner();
      break;
    case 'success':
      // Render data
      renderData(state.data);
      hideSpinner();
      break;
    case 'error':
      // Show error message
      showError(state.error?.message);
      hideSpinner();
      break;
  }
});
```

### **2. Use Proper Initial Values**

Initialize your fetch state with appropriate default values that match the expected response type:

```typescript
// For object responses
const userState = fetchState<User | null>(null, { url: '/api/user' });

// For array responses
const usersState = fetchState<User[]>([], { url: '/api/users' });

// For primitive responses
const countState = fetchState<number>(0, { url: '/api/count' });
```

### **3. Handle Network Errors Gracefully**

Network errors are common and should be handled gracefully:

```typescript
import { fetchState, subscribe } from '@anchorlib/core';

const apiState = fetchState<Data | null>(null, { url: '/api/data' });

subscribe(apiState, (state) => {
  if (state.status === 'error') {
    // Log error for debugging
    console.error('API Error:', state.error);

    // Show user-friendly message
    showUserFriendlyError('Unable to load data. Please try again later.');
  }
});
```

### **4. Clean Up Subscriptions**

When using [subscribe] with fetch states, remember to clean up subscriptions when they're no longer needed:

```typescript
import { fetchState, subscribe, subscribe } from '@anchorlib/core';

const state = fetchState([], { url: '/api/data' });

// Store the unsubscribe function
const unsubscribe = subscribe(state, (state) => {
  // Handle state changes
});

// Call unsubscribe when component unmounts or when no longer needed
// unsubscribe();
```

### **5. Use Promise Conversion When Needed**

For traditional async/await flows, use the promise conversion:

```typescript
import { fetchState } from '@anchorlib/core';

async function loadUserData() {
  const state = fetchState(null, { url: '/api/user' });

  try {
    const result = await fetchState.promise(state);
    return result.data;
  } catch (error) {
    console.error('Failed to load user data:', error);
    throw error;
  }
}
```
