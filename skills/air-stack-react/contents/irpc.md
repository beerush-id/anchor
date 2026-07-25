## Isomorphic RPC (IRPC) — React Bindings

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

This file covers only React-specific UI binding patterns.

---

### IRPC in React Components

#### `.once()` — Static Execution

Executes immediately when the component mounts. Reads are tracked inside `render()` boundaries.

```tsx
import { setup, render, Show } from '@anchorlib/react';
import { getUser } from './function.js';

export const UserCard = setup<{ id: string }>((props) => {
  const user = getUser.once(props.id);

  return render(() => (
    <div>
      <Show when={() => user.status === 'pending'}>Loading...</Show>
      <h1>{user.data.name}</h1>
    </div>
  ));
});
```

#### `.with()` — Eager Reactive

Tracks the arguments getter and re-executes when arguments change. The `render()` wrapper tracks the reactive read.

```tsx
import { setup, render, mutable } from '@anchorlib/react';
import { searchUsers } from './function.js';

export const UserSearch = setup(() => {
  const state = mutable({ query: '' });
  const results = searchUsers.with(() => [state.query], 300);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    state.query = e.currentTarget.value;
  };

  return render(() => (
    <>
      <input value={state.query} onInput={handleInput} />
      <ul>{results.data?.map(u => <li>{u.name}</li>)}</ul>
    </>
  ));
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

return render(() => (
  <button onClick={() => uploader.dispatch(props.id, file)}>Upload</button>
));
```

### IRPC with Streams

For streaming functions, the `effect.client()` boundary handles reactive updates:

```tsx
import { setup, effect } from '@anchorlib/react';
import { watchPrice } from './function.js';

export const PriceDisplay = setup<{ symbol: string }>((props) => {
  const stream = watchPrice.once(props.symbol);

  effect.client(() => {
    // React to stream data changes
    if (stream.data.price > 100) notifyUser();
  });

  return render(() => <div>${stream.data.price.toFixed(2)}</div>);
});
```

### Key Differences from `air-irpc` Skill

| Aspect | `air-irpc` (canonical) | React binding |
|---|---|---|
| Component integration | Uses generic examples | Uses `setup()` + `render()` wrapper |
| Effect boundaries | `effect()` | `effect.client()` for browser-only |
| Reactive reads | Assumes reactive JSX | Must wrap in `render()`, `<Show>`, or `snippet()` |
