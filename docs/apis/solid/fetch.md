# Fetch APIs

The fetch APIs in Anchor for Solid provide functions for handling HTTP requests and streaming data with reactive state
management.

## fetchRef

Creates a fetch state for handling HTTP requests.

### Syntax

```ts
// GET or DELETE requests
declare function fetchRef<R>(init: R, options: FetchOptions & { method: 'GET' | 'DELETE' }): FetchState<R>;

// POST, PUT, or PATCH requests
declare function fetchRef<R, P>(
  init: R,
  options: FetchOptions & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): FetchState<R>;

// Generic form
declare function fetchRef<R>(init: R, options: FetchOptions): FetchState<R>;
```

### Parameters

- `init` - The initial data
- `options` - Fetch options with HTTP method and other configuration

### Returns

A fetch state object with properties for data, loading state, and errors.

### Examples

```tsx
import { fetchRef } from '@anchorlib/solid';

// GET request
const userProfile = fetchRef(null, {
  url: '/api/user/profile',
  method: 'GET',
  auto: true,
});

// POST request
const createUser = fetchRef(null, {
  url: '/api/users',
  method: 'POST',
  body: { name: 'John', email: 'john@example.com' },
});

// Manual fetch
const fetchData = () => {
  createUser.fetch({ name: 'Jane', email: 'jane@example.com' });
};
```

::: warning Caveat

The fetch is automatically called when the state is created. Use `{ deferred: true }` option to defer the request
until `fetch()` is explicitly called.

:::

## streamRef

Creates a stream state for handling streaming data.

### Syntax

```ts
// GET or DELETE requests
declare function streamRef<R>(init: R, options: StreamOptions<R> & { method: 'GET' | 'DELETE' }): FetchState<R>;

// POST, PUT, or PATCH requests
declare function streamRef<R, P>(
  init: R,
  options: StreamOptions<R> & { method: 'POST' | 'PUT' | 'PATCH'; body: P }
): FetchState<R>;

// Generic form
declare function streamRef<R>(init: R, options: StreamOptions<R>): FetchState<R>;
```

### Parameters

- `init` - The initial data
- `options` - Stream options with HTTP method and streaming configuration

### Returns

A fetch state object that handles streaming data.

### Examples

```tsx
import { streamRef } from '@anchorlib/solid';

// Stream data from an API
const dataStream = streamRef([], {
  url: '/api/stream/data',
  method: 'GET',
  onData: (current, chunk) => [...current, chunk],
});

// Start streaming
const startStreaming = () => {
  dataStream.fetch();
};
```

::: warning Caveat

The fetch is automatically called when the state is created. Use `{ deferred: true }` option to defer the request
until `fetch()` is explicitly called.

:::
