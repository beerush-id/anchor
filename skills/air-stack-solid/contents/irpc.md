## Isomorphic RPC (IRPC) — Solid Bindings

Core IRPC API documentation (declarations, handlers, streaming, CRUD, testing, etc.) is in the **`air-irpc` skill**. If you haven't installed it:

```
npx skills add beerush-id/anchor --skill air-irpc --yes
```

Then read the relevant sub-module:

- **Setup & Routing** → `skills/air-irpc/contents/setup-and-routing.md`
- **Declarations & Handlers** → `skills/air-irpc/contents/declarations-and-handlers.md`
- **Execution & Streaming** → `skills/air-irpc/contents/execution-and-streaming.md`
- **CRUD & Adapters** → `skills/air-irpc/contents/crud-and-adapters.md`
- **Library Authoring** → `skills/air-irpc/contents/library-authoring.md`
- **Testing** → `skills/air-irpc/contents/testing.md`

This file covers only Solid-specific UI binding patterns.

---

### IRPC in Solid Components

#### `.once()` — Static Execution

Executes immediately when the component mounts. Solid's native JSX reactivity tracks reads automatically — no `render()` wrapper needed.

```tsx
import { setup, Show } from '@anchorlib/solid';
import { getUser } from './function.js';

export const UserCard = setup<{ id: string }>((props) => {
  const user = getUser.once(props.id);

  return (
    <div>
      <Show when={user.status === 'pending'}>Loading...</Show>
      <h1>{user.data.name}</h1>
    </div>
  );
});
```

#### `.with()` — Eager Reactive

Tracks the arguments getter and re-executes when arguments change. Solid's reactivity handles tracking natively in JSX.

```tsx
import { setup, mutable } from '@anchorlib/solid';
import { searchUsers } from './function.js';

export const UserSearch = setup(() => {
  const state = mutable({ query: '' });
  const results = searchUsers.with(() => [state.query], 300);

  return (
    <>
      <input value={state.query} onInput={(e) => { state.query = e.currentTarget.value; }} />
      <ul>{results.data?.map(u => <li>{u.name}</li>)}</ul>
    </>
  );
});
```

#### `.when()` — Lazy Reactive

Skips initial execution. Runs only after the arguments change.

```tsx
const search = searchUsers.when(() => [state.query], 300);
```

#### `.later()` — Imperative Dispatch

Defers execution until `.dispatch()` is called manually.

```tsx
const uploader = uploadAvatar.later(200);

return (
  <button onClick={() => uploader.dispatch(props.id, file)}>Upload</button>
);
```

### IRPC with Streams

For streaming functions, `effect()` handles reactive updates to stream data:

```tsx
import { setup, effect } from '@anchorlib/solid';
import { watchPrice } from './function.js';

export const PriceDisplay = setup<{ symbol: string }>((props) => {
  const stream = watchPrice.once(props.symbol);

  effect(() => {
    // React to stream data changes
    if (stream.data.price > 100) notifyUser();
  });

  return <div>${stream.data.price.toFixed(2)}</div>;
});
```

### Key Differences from `air-irpc` Skill

| Aspect | `air-irpc` (canonical) | Solid binding |
|---|---|---|
| Component integration | Uses generic examples | Uses `setup()` directly — no `render()` wrapper |
| Effect boundaries | `effect()` | `effect()` (Solid handles SSR natively) |
| Reactive reads | Assumes reactive JSX | Native — reads in JSX are automatically tracked |
