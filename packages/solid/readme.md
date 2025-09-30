# Anchor Solid Library

This is the official Anchor library for Solid. It provides a set of tools to manage state in your Solid applications, based on the principles of the Anchor framework.

## Installation

```bash
npm install @anchorlib/solid
```

## Documentation

For full documentation, visit [Anchor for Solid](https://anchor.mahdaen.name/docs/solid/introduction.html)

## Quick Start

Here's a simple example of how to use `variableRef`, `anchorRef` and `observedRef` in a Solid component:

```tsx
import { variableRef, anchorRef, observedRef } from '@anchorlib/solid';

// In your component
function MyComponent() {
  // Using variableRef for simple reactive values
  const count = variableRef(0);

  // Using anchorRef for complex reactive objects
  const state = anchorRef({
    user: {
      name: 'John Doe',
      age: 30,
    },
    isAuthenticated: false,
  });
  const user = state.user;

  // Using observedRef for computed values
  const doubled = observedRef(() => user.age * 2);

  return (
    <div>
      <h1>{user.name}</h1>
      <p>Age: {user.age}</p>
      <p>Doubled age: {doubled.value}</p>
      <button onClick={() => user.age++}>Increment Age</button>
      <button onClick={() => count.value++}>Count is {count.value}</button>
    </div>
  );
}
```

## License

MIT
