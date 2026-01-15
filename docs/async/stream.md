# **Stream API**

The stream API provides reactive state management for streaming HTTP responses. It handles incremental data updates as chunks are received, making it perfect for real-time data or large responses that should be processed as they arrive.

::: tip Optimistic Model

The stream API uses an **optimistic model** where the initial state is used to display loading states. This means that the
initial state is displayed while the request is pending. It's also useful to build a streaming UI such as a chat app.

:::

## **`streamState`**

Create a reactive stream state object that handles streaming responses and updates incrementally as data chunks are received.

### **Type Signature**

```ts
type streamState = <T, S extends LinkableSchema = LinkableSchema>(
  init: T,
  options?: StreamOptions<T, S>
) => FetchState<T>;
```

### **Parameters**

- **`init`** - The initial data value for the state
- **`options`** - Configuration options including URL, standard **`RequestInit`** parameters, and optional transform function

### **Return Value**

Returns a reactive **`FetchState`** object with the following properties:

- **`data`** - The streamed data (initially the provided initial value, grows as chunks arrive)
- **`status`** - Current request status (`idle`, `pending`, `success`, or `error`)
- **`error`** - Error object if the request failed
- **`response`** - Raw Response object from the fetch API
- **`fetch(options?)`** - Function to manually start or restart the stream
- **`abort()`** - Function to cancel the current stream

### **Options**

The options object extends **`FetchOptions`** and includes:

- **`url`** - The URL to fetch (string or URL object)
- **`transform`** - Optional function to transform each chunk before appending it to the data
- All standard **`RequestInit`** properties like method, headers, body, etc.

### **Transform Function**

The transform function allows you to customize how chunks are appended to the existing data:

```ts
type transform = (current: T, chunk: T) => T;
```

Depending on the data type:

- For strings: chunks are concatenated
- For objects: chunks are merged using `anchor.assign`
- For arrays: chunk elements are pushed to the array

### **Usage**

```typescript
import { streamState, subscribe } from '@anchorlib/core';

// Stream text data
const textStream = streamState(
  '', // Initial empty string
  {
    url: '/api/stream-text',
  }
);

// Stream JSON array data
const arrayStream = streamState(
  [], // Initial empty array
  {
    url: '/api/stream-array',
    transform: (current, chunk) => {
      // Custom transform logic
      return [...current, ...chunk];
    },
  }
);

// Subscribe to state changes
subscribe(textStream, (state) => {
  switch (state.status) {
    case 'pending':
      console.log('Stream connecting...');
      break;
    case 'success':
      console.log('Stream complete. Final data:', state.data);
      break;
    case 'error':
      console.error('Stream error:', state.error);
      break;
    default:
      // While streaming, data is updated incrementally
      console.log('Received data:', state.data);
  }
});
```

## **`streamState.promise`**

Convert a stream state object to a Promise for traditional async/await usage.

### **Type Signature**

```ts
type promise = <T, S extends FetchState<T>>(state: S) => Promise<S>;
```

### **Parameters**

- **`state`** - A stream state object created by **`streamState`**

### **Return Value**

Returns a Promise that resolves with the final state when the stream completes, or rejects with the error when the stream fails.

### **Usage**

```typescript
import { streamState } from '@anchorlib/core';

const stream = streamState('', { url: '/api/stream' });

try {
  const finalState = await streamState.promise(stream);
  console.log('Stream complete. Final data:', finalState.data);
} catch (error) {
  console.error('Stream failed:', error);
}
```

## **Examples**

### **Streaming Text Data**

```typescript
import { streamState } from '@anchorlib/core';

// Stream a large text file
const logStream = streamState('', {
  url: '/api/logs',
});

// As chunks arrive, logStream.data will grow with the received text
```

### **Streaming JSON Array**

```typescript
import { streamState } from '@anchorlib/core';

interface Item {
  id: number;
  name: string;
}

// Stream an array of items
const itemStream = streamState<Item[]>([], {
  url: '/api/items/stream',
});

// As chunks of items arrive, they will be pushed to the array
```

### **Custom Transform Function**

```typescript
import { streamState } from '@anchorlib/core';

interface DataChunk {
  items: string[];
  timestamp: number;
}

// Stream with custom transform
const customStream = streamState<DataChunk[]>([], {
  url: '/api/data/stream',
  transform: (current, chunk) => {
    // Add timestamp to each chunk
    return [...current, { ...chunk, timestamp: Date.now() }];
  },
});
```

### **Real-time Updates**

```typescript
import { streamState, subscribe } from '@anchorlib/core';

const chatStream = streamState<string>('', {
  url: '/api/chat/stream',
});

// Update UI in real-time as messages arrive
subscribe(chatStream, (state) => {
  if (state.status === 'success') {
    // Stream completed
    document.getElementById('status')!.textContent = 'Connection closed';
  } else if (state.status === 'error') {
    // Stream error
    document.getElementById('status')!.textContent = 'Connection error';
  } else {
    // Update with new data as it arrives
    document.getElementById('chat')!.textContent = state.data;
  }
});
```

## **Best Practices**

### **1. Choose Appropriate Initial Values**

Initialize stream states with appropriate values that can be incrementally updated:

```typescript
// For text streaming
const textStream = streamState('', { url: '/api/stream-text' });

// For array streaming
const arrayStream = streamState<Item[]>([], { url: '/api/stream-array' });

// For object merging
const objectStream = streamState<Partial<Data>>({}, { url: '/api/stream-object' });
```

### **2. Use Transform Functions for Complex Data Handling**

When you need custom logic for handling chunks, use transform functions:

```typescript
const stream = streamState<Item[]>([], {
  url: '/api/items',
  transform: (current, chunk) => {
    // Deduplicate items based on ID
    const existingIds = new Set(current.map((item) => item.id));
    const newItems = chunk.filter((item) => !existingIds.has(item.id));
    return [...current, ...newItems];
  },
});
```

### **3. Handle Different Stream Completion States**

Make sure to handle all possible states of a stream:

```typescript
import { streamState, subscribe } from '@anchorlib/core';

const stream = streamState<string>('', { url: '/api/stream' });

subscribe(stream, (state) => {
  switch (state.status) {
    case 'pending':
      showConnectingStatus();
      break;
    case 'success':
      showCompletedStatus();
      break;
    case 'error':
      showStreamError(state.error);
      break;
    default:
      // Streaming in progress
      updateWithIncrementalData(state.data);
  }
});
```

### **4. Clean Up Long-running Streams**

For long-running streams, ensure you clean up properly:

```typescript
import { streamState, subscribe } from '@anchorlib/core';

const stream = streamState('', { url: '/api/stream' });

const unsubscribe = subscribe(stream, (state) => {
  // Handle streaming data
});

// When component unmounts or stream no longer needed:
// unsubscribe();
```

### **5. Handle Large Data Streams Efficiently**

For streams that produce large amounts of data, consider throttling updates:

```typescript
import { streamState, subscribe, subscribe } from '@anchorlib/core';

const stream = streamState('', { url: '/api/large-stream' });

let lastUpdate = Date.now();
const UPDATE_INTERVAL = 100; // ms

subscribe(stream, (state) => {
  const now = Date.now();

  // Only update UI at most every 100ms to prevent performance issues
  if (state.status === 'pending' && now - lastUpdate > UPDATE_INTERVAL) {
    updateUIWithStreamData(state.data);
    lastUpdate = now;
  } else if (state.status !== 'pending') {
    // Always update for final states
    updateUIWithStreamData(state.data);
  }
});
```

### **6. Validate Stream Data**

When working with streamed JSON data, validate chunks before processing:

```typescript
import { streamState } from '@anchorlib/core';

interface ValidatedItem {
  id: number;
  name: string;
}

const stream = streamState<ValidatedItem[]>([], {
  url: '/api/stream',
  transform: (current, chunk) => {
    // Validate chunk before adding to current data
    if (Array.isArray(chunk) && chunk.every((item) => typeof item.id === 'number' && typeof item.name === 'string')) {
      return [...current, ...chunk];
    }

    console.warn('Invalid chunk received, skipping:', chunk);
    return current;
  },
});
```
