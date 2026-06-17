# IRPC: Execution and Streaming

IRPC client stubs (`.once`, `.with`, `.later`) return an `IRPCReader<T>`, while handlers yield a `RemoteState<T>`.

## Component APIs

To interact with the results returned by executing client stubs, call the stub execution methods natively:

```tsx
import { setup, render, mutable } from '@anchorlib/react';
import { getUser, searchUsers, uploadAvatar, getAppConfig } from './api/index.js';

export const UserProfile = setup<{ id: string }>((props) => {
  const state = mutable({ query: '' });

  // Static Execution (.once)
  const config = getAppConfig.once('web');

  // Eager Reactive Execution (.with)
  const user = getUser.with(() => [props.id]);

  // Lazy Reactive Execution (.when)
  const search = searchUsers.when(() => [state.query], 300);

  // Imperative Execution (.later)
  const uploader = uploadAvatar.later();

  return render(() => (
    <div>
      <h1>{user.data?.name}</h1>
      <button onClick={() => uploader.dispatch(props.id, 'file')}>Upload</button>
    </div>
  ));
});
```

The execution methods take:
```typescript
// once
(
  /** Standard arguments matching the generic signature A */
  ...args: A
)

// with
(
  /** A factory returning the arguments array. Re-runs when arguments mutate. */
  args: () => A, 
  
  /** Debounce delay in milliseconds before executing the network call. */
  debounce?: number
)

// when
(
  /** A factory returning the arguments. Skips initial execution until arguments mutate. */
  args: () => A, 
  
  /** Debounce delay in milliseconds before executing the network call. */
  debounce?: number
)

// later
(
  /** Debounce delay applied when manual .dispatch() is called. */
  debounce?: number
)
```

The execution methods return:
```typescript
/** A client-side consumer that hydrates `RemoteState` instances from network stream packets. */
class IRPCReader<T extends IRPCData> extends RemoteState<T> {
  /** The response data. Immediately populated by config.seed(). */
  public data: T;                  
  
  /** Any error returned by the server or transport. */
  public error: Error | undefined;
  
  /** The current execution status. */
  public status: 'idle' | 'error' | 'pending' | 'success' | 'aborted';
  
  /** Optional callback fired when the stream closes. */
  public onClose?: () => void;

  /** Aborts the local request without notifying the server. */
  public abort(): void;
  
  /** Manually aborts the call and immediately triggers server cleanup. */
  public close(): void;            
  
  public pipe(): this;
  public unpipe(): this;
  public pipeTo(target: RemoteState<T>): this;
  
  /** Subscribes to internal state mutations for framework reactivity. */
  public subscribe(handler: (state: IRPCReadable<T>, event: unknown) => void): () => void;
}

type IRPCReadable<T> = {
  data: T;
  error: Error | undefined;
  status: IRPCStatus;
};

type IRPCStatus = 'idle' | 'error' | 'pending' | 'success' | 'aborted';
```

*(Note: `later()` returns `IRPCReader<T> & { dispatch: (...args: A) => void }`)*

## Reactive Streaming

Instead of returning a static `Promise<T>`, handlers can return `RemoteState<T>`. 

To construct custom reactive streams manually for handlers, use `stream()`:

```typescript
type ChatFn = (prompt: string) => RemoteState<{ text: string }>;
export const chat = irpc.declare<ChatFn>('chat', () => ({ text: '' }));

irpc.construct(chat, (prompt) => {
  return stream(async (state, resolve, reject) => {
    const response = await ai.generate(prompt);
    
    for await (const chunk of response) {
      // Modifying the state sends delta updates over the wire instantly!
      state.data.text += chunk; 
    }
    
    resolve(); // Fulfills users doing `await chat()`
    
    return () => response.abort();
  });
});
```

The `stream()` takes:
```typescript
<T>(
  /** 
   * The stream controller function executing the logic. 
   * Modifying `state.data` sends updates. Call `resolve()` when finished. 
   */
  construct: (
    state: IRPCReadable<T>,
    resolve: (value?: T) => void,
    reject: (error: Error) => void
  ) => (() => void) | void | Promise<(() => void) | void>,
  
  /** An optional explicit seed to override the stub's default seed. */
  seed?: T
)
```

The `stream()` returns:
```typescript
/** A server-side state controller that pushes mutations to the client reader. */
class RemoteState<T> extends Promise<T> {
  public data: T;
  public error: Error | undefined;
  public status: IRPCStatus;

  public abort(): void;
  public close(): void;
  public pipe(): this;
  public unpipe(): this;
  public pipeTo(target: RemoteState<T>): this;
  public subscribe(handler: (state: IRPCReadable<T>, event: unknown) => void): () => void;
}
```

## File Uploads & Downloads

To natively send and receive files isomorphically without FormData mapping, use `IRPCFile`:

```typescript
export const uploadAvatar = irpc.declare<(file: IRPCFile) => Promise<void>>('upload', () => undefined);

// Server
irpc.construct(uploadAvatar, async (file) => {
  const buffer = await file.data.arrayBuffer();
  await saveToDisk(file.meta.name, buffer);
});

// Client
const avatar = new IRPCFile({ name: file.name }, file);
await uploadAvatar(avatar);
```

The `IRPCFile` constructor takes:
```typescript
(
  /** Metadata describing the file. */
  meta: IRPCFileMeta, 
  
  /** The native file blob or buffer content. */
  data?: Blob
)
```

```typescript
type IRPCFileMeta = {
  size: number;
  type: string;
  name?: string;
};
```

The `IRPCFile` returns:
```typescript
class IRPCFile {
  /** The provided metadata. */
  public meta: IRPCFileMeta;
  
  /** The file contents. */
  public data: Blob;
  
  /** The current transmission state. */
  public get status(): IRPCFileStatus;
  
  /** Stream failure cause, if any. */
  public get error(): Error | undefined;
  
  /** The number of bytes successfully processed. */
  public get downloaded(): number;
  
  /** Check if the file is successfully uploaded/downloaded. */
  public get success(): boolean;
  
  /** Check if the file process has completed (either success or error). */
  public get completed(): boolean;
}

type IRPCFileStatus = 'idle' | 'pending' | 'success' | 'aborted' | 'error';
```

## Credentials

To inject credentials dynamically for server-to-server calls or 3rd-party integration, use `transport.sign()` and `credential()`:

```typescript
// Attach credentials to outgoing requests
transport.sign(() => ({ AUTH_TOKEN: getSessionToken() }));

// Server: Extract credentials in handler
irpc.construct(getProfile, async () => {
  const token = credential<string>('AUTH_TOKEN');
  // ...
});
```

The `transport.sign()` takes:
```typescript
(
  /** A factory returning headers/credentials to inject into packets, or a raw object. */
  signer: Record<string, unknown> | (() => Record<string, unknown>)
)
```

The `credential()` takes:
```typescript
<T>(
  /** The exact key name of the credential attached via the signer. */
  key: string
)
```

The `credential()` returns:
```typescript
/** The specific credential value or undefined. */
T | undefined
```

## Cache Invalidation & Subscriptions

To clear cached results system-wide, use `irpc.invalidate()`:

```typescript
// Clear all cached results for this stub globally
irpc.invalidate(getUser);

// Clear specific arguments
irpc.invalidate(getUser, 'user-123');
```

The `irpc.invalidate()` takes:
```typescript
(
  /** The universal stub to invalidate cache for. */
  stub: IRPCHandler, 
  
  /** Specific arguments to clear. If empty, all cached executions for the stub are cleared. */
  ...args: IRPCData[]
)
```
