## 12. Persistent State

State that survives page navigation, browser restart, or exceeds cookie/localStorage limits.

### Package

```
@anchorlib/storage      → session(), persistent()
@anchorlib/storage/db   → kv(), createTable()
```

### Session: API Signatures

Syncs with `sessionStorage`. Data persists within the browser tab — closing the tab clears it.

```typescript
import { session } from '@anchorlib/storage';

function session<T>(name: string, init: T, options?: StateOptions): T;
function session.leave<T>(state: T): void;
```

### Session: Usage

```typescript
import { session } from '@anchorlib/storage';

// User composing an email — survives page refresh, gone when tab closes
const draft = session('email-draft', {
  to: '',
  subject: '',
  body: '',
});

draft.subject = 'Meeting tomorrow';
draft.body = 'Let me know if 3pm works.';

// User sends the email — stop tracking the draft
session.leave(draft);
```

---

### Persistent: API Signatures

Syncs with `localStorage`. Data persists across browser sessions. ~5MB limit per origin.

```typescript
import { persistent } from '@anchorlib/storage';

function persistent<T>(name: string, init: T, options?: StateOptions): T;
function persistent.leave<T>(state: T): void;
```

### Persistent: Usage

```typescript
import { persistent } from '@anchorlib/storage';

// Track what the user searched for — survives browser restart
const recentSearches = persistent('recent-searches', {
  queries: [] as string[],
  lastUsed: '',
});

recentSearches.queries.push('anchor reactive');
recentSearches.lastUsed = 'anchor reactive';

// User clears search history
persistent.leave(recentSearches);
```

---

### KV Store: API Signatures

Backed by IndexedDB. For data that exceeds localStorage limits or needs structured values.

```typescript
import { kv } from '@anchorlib/storage/db';

interface KVFn {
  <T>(key: string, init?: T): KVState<T>;
  leave<T>(state: KVState<T>): void;
  remove(key: string): void;
  ready(): Promise<true>;
}

type KVState<T> = {
  data: T;
  status: 'init' | 'ready' | 'error' | 'removed';
  error?: Error;
};
```

### KV Store: Usage

```typescript
import { kv } from '@anchorlib/storage/db';

// Notes app — content can be large, localStorage can't hold it
const note = kv('meeting-notes-2024', {
  content: '',
  tags: [] as string[],
});

// User types content — auto-persisted to IndexedDB
note.data.content = 'Q3 planning: budget review, hiring timeline...';
note.data.tags.push('work', 'planning');

// Ensure write completes before showing "Saved" indicator
await kv.ready();

// User navigates away — stop syncing this entry
kv.leave(note);

// User deletes the note
kv.remove('meeting-notes-2024');
```

---

### Reactive Table: API Signatures

Structured records with auto-generated `id`, `created_at`, `updated_at`.

```typescript
import { createTable } from '@anchorlib/storage/db';

function createTable<T, R extends Row<T> = Row<T>>(
  name: string,
  version?: number,
  indexes?: (keyof R)[],
  remIndexes?: (keyof R)[],
  dbName?: string,
  seeds?: R[]
): ReactiveTable<T, R>;
```

```typescript
type Row<T> = T & {
  id: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
};

type RowState<R> = { data: R; status: RowStatus; error?: Error };
type RowListState<R> = { data: R[]; count: number; status: RowStatus; error?: Error };
type RowStatus = 'init' | 'pending' | 'ready' | 'error' | 'removed';
```

```typescript
interface ReactiveTable<T, R> {
  get(id: string): RowState<R>;
  add(payload: T): RowState<R>;
  list(filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection): RowListState<R>;
  listByIndex(name: keyof R, filter?: IDBKeyRange | FilterFn<R>, limit?: number, direction?: IDBCursorDirection): RowListState<R>;
  remove(id: string): RowState<R>;
  leave(id: string): void;
  promise<S extends RowState<R> | RowListState<R>>(state: S): Promise<S>;
  seed(seeds: R[]): this;
}
```

### Reactive Table: Usage

```typescript
import { createTable } from '@anchorlib/storage/db';

type Task = {
  title: string;
  done: boolean;
  priority: number;
};

// Offline-capable task list — indexed by done status and priority
const tasks = createTable<Task>('tasks', 1, ['done', 'priority']);

// User creates a task
const task = tasks.add({ title: 'Ship v1', done: false, priority: 1 });
await tasks.promise(task);

// User edits the task — mutations auto-persist
task.data.title = 'Ship v1.0.1';
task.data.done = true;

// Show only incomplete tasks
const pending = tasks.list((t) => !t.data.done, 50);
await tasks.promise(pending);

// Show high-priority tasks using the index
const urgent = tasks.listByIndex('priority', IDBKeyRange.upperBound(2), 10);

// User deletes a task
tasks.remove(task.data.id);

// User navigates away from task detail — stop tracking this row
tasks.leave(task.data.id);
```

### Seed Data

```typescript
// Pre-populate categories on first load
const categories = createTable<{ name: string; order: number }>('categories', 1)
  .seed([
    { id: '1', name: 'General', order: 0, created_at: new Date(), updated_at: new Date() },
    { id: '2', name: 'Archive', order: 1, created_at: new Date(), updated_at: new Date() },
  ]);
```
