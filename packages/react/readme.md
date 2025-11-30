# @anchorlib/react

The next-generation React component architecture, featuring stable components and fine-grained reactivity.

## Features

- **Modern Architecture** - Components that render once and update only when necessary
- **Fine-Grained Reactivity** - Modern `setup` and `template` pattern for optimal performance
- **Universal Component** - Component that work safely in both Server and Client.
- **Backward Compatibility** - Can co-exist with the standard React components, supporting gradual migration.

## Installation

```bash
npm install @anchorlib/react
```

## Setup

To enable reactivity, you must initialize the binding in your client entry file (e.g., `app/layout.tsx` or `pages/_app.tsx`).

```tsx
// app/layout.tsx or client entry
import '@anchorlib/react/client';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
```

## Usage

### Modern Component Architecture

Use `setup` and `template` to separate logic from rendering, ensuring components are stable and only re-render when necessary.

```tsx
import { setup, template, mutable } from '@anchorlib/react';

// 1. Define the logic (runs once per component instance)
const Counter = setup(() => {
  const counter = mutable({ count: 0 });
  
  // Define the reactive template.
  const Template = template(() => (
    <h1>Count: {counter.count}</h1>
  ));

  // Return a static template.
  return (
    <div>
      <Template />
      <button onClick={() => counter.count++}>Increment</button>
    </div>
  );
});
```

The `Counter` component is a universal component that works safely in both Server and Client. On the client side, the `Counter` component itself is rendered once. Only the reactive template is re-rendered when the state changes.

## Migration Guide

### Upgrading from v1.0.0-beta.12 or earlier

**Breaking Change:** In v1.0.0-beta.13, we've simplified the API by replacing the hook-based pattern with the `setup()` + `template()` pattern.

To keep your existing code working, install the classic package and update your imports:

```bash
npm install @anchorlib/react-classic
```

Then replace all imports from `@anchorlib/react` to `@anchorlib/react-classic` in your project.

For migration guide to the new API, see the [documentation](https://anchorlib.dev).

## License

MIT