# **Getting Started**

Anchor's request module provides reactive state management for HTTP requests and streaming data. It seamlessly
integrates with the core Anchor reactivity system, allowing you to easily manage loading states, handle errors, and work
with fetched data in a reactive way.

## **Overview**

The request module offers two main functions:

1. **`fetchState`** - For standard HTTP requests with reactive state management
2. **`streamState`** - For handling streaming responses with incremental updates

Both functions create reactive state objects that automatically update as requests progress, making it easy to build
responsive UIs that react to loading states, errors, and data changes.

## **Installation**

The request module is part of `@anchorlib/core`, so no additional installation is required if you've already installed the
core package:

::: code-group

```sh [Bun]
bun add @anchorlib/core
```

```sh [NPM]
npm install @anchorlib/core
```

```sh [Yarn]
yarn add @anchorlib/core
```

```sh [PNPM]
pnpm add @anchorlib/core
```

:::

## **Basic Usage**

### **Simple Fetch Request**

```typescript
import { fetchState } from '@anchorlib/core/fetch';

// Create a reactive fetch state
const userState = fetchState(
  null, // Initial data
  {
    url: '/api/users/1',
    method: 'GET',
  }
);

// The state will automatically update as the request progresses
console.log(userState.status); // 'pending'
// After request completes:
// userState.status will be 'success' or 'error'
// userState.data will contain the fetched data
// userState.error will contain any error that occurred
```

### **Streaming Request**

```typescript
import { streamState } from '@anchorlib/core/fetch';

// Create a reactive stream state
const streamState = streamState(
  '', // Initial data
  {
    url: '/api/stream',
    method: 'GET',
  }
);

// The state will incrementally update as chunks arrive
// streamState.data will grow as more data is received
```

## **Key Concepts**

### **Reactive States**

Both **`fetchState`** and **`streamState`** return reactive state objects that automatically update as requests progress:

- **`data`** - The fetched data (initially the provided initial value)
- **`status`** - Current request status (`idle`, `pending`, `success`, or `error`)
- **`error`** - Error object if the request failed
- **`response`** - Raw Response object from the fetch API

### **Automatic JSON Parsing**

When a response has `Content-Type: application/json`, the response body is automatically parsed as JSON. For other
content types, the raw text is used.

### **Promise Integration**

Both functions include a `promise` method to convert the reactive state back to a traditional Promise:

```typescript
import { fetchState } from '@anchorlib/core/fetch';

const state = fetchState({}, { url: '/api/data' });

// Convert to Promise
const promise = fetchState.promise(state);
promise
  .then((result) => {
    console.log(result.data);
  })
  .catch((error) => {
    console.error(error);
  });
```
