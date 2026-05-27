## Headless Composition

Abstracting logic outside of the component tree enables strict separation of concerns, massive performance benefits, seamless portability across frameworks, and pure unit testability without UI overhead.

### Headless State
Use Headless State to manage complex data structures and mutations independent of any UI representation.

```typescript
import { mutable, effect } from '@anchorlib/react';

// Optional Shape
export function createFilterState(init?: { query?: string; category?: string }) {
  const state = mutable({
    ...init,
    clear() {
      this.query = undefined;
      this.category = undefined;
    }
  });
  
  // Optionally encapsulate internal side effects directly within the factory
  effect(() => console.log('Filters updated:', state));
  
  return state;
}
```

```typescript
import { mutable } from '@anchorlib/react';

// Guaranteed Shape
export function createStrictUserForm({ name = '', email = '' } = {}) {
  return mutable({
    name,
    email,
    submit() {
      // Internal mutation logic
    }
  });
}
```

### Headless Logic
Use Headless Logic (like classes) to model pure domain logic or state machines independently.

```typescript
import { mutable } from '@anchorlib/react';

export class TabState {
  public active: string;
  constructor(init: string) { this.active = init; }
  public setActive(tab: string) { this.active = tab; }
}

export function createTab(init: string = 'home') {
  return mutable(new TabState(init));
}
```

### Headless Action
Use Headless Actions to compose reusable, highly-optimized DOM side effects. The action encapsulates both the reactive reference and the side-effect logic, returning a clean binding target for the UI.

```typescript
import { mutable, effect } from '@anchorlib/react';

export function createKeyPress(key: string, handler: () => void) {
  const ref = mutable<{ current: HTMLElement | null }>({ current: null });

  effect(() => {
    const el = ref.current;
    if (!el) return;

    const listener = (e: KeyboardEvent) => {
      if (e.key === key) handler();
    };
    
    el.addEventListener('keydown', listener);
    
    return () => el.removeEventListener('keydown', listener);
  });

  return ref;
}
```

### Framework Agnostic Logic
If you want to share the same logic to non-react framework, import from `@anchorlib/core` instead of `@anchorlib/react`.

```ts
import { mutable } from '@anchorlib/core';

export function createAccordion() {
  return mutable({ active: '', open: false });
}
```

```tsx
// React
const Accordion = setup(() => {
  const state = createAccordion();
});
```

```tsx
// SolidJS
const Accordion = setup(() => {
  const state = createAccordion();
});
```
