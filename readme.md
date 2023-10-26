<h1 align="center">Anchor - Keep Simple Things Simple</h1>

<p align="center">Embrace JavaScript's natural mutability for effortlessly managing state — from simple todos to complex graphic design
apps. Anchor handles state complexity with elegance, making any app's state a breeze.</p>

[Preview.webm](https://github.com/beerush-id/anchor/assets/1680665/b158c7ca-cefb-480f-a514-2b64e573fb89)

> 🚧 **Note:** Anchor is currently in its early development stages. While it is fully functional and ready for use, there
> could be occasional changes as we strive to improve and optimize it. Bug reports, suggestions, and contributions are
> very welcome and appreciated!

Don't forget to star ⭐ the project if you find it interesting and stay tuned for upcoming updates.

## 🆚 Why Anchor?

| Operation                                    | Anchor                                 | React useState                                               | Svelte writable                                           |
|----------------------------------------------|----------------------------------------|--------------------------------------------------------------|-----------------------------------------------------------|
| **Nested Property Assignment**               | `user.name = 'John';`                  | `setUser({ ...user, name: 'John' });`                        | `user = { ...user, name: 'John' };`                       |
| **Increment a Nested Property**              | `user.views += 1;`                     | `setUser({ ...user, views: user.views + 1 });`               | `user.views += 1; user = user;`                           |
| **Deriving Nested Property**                 | `user.views += 1;`                     | `setUser(prev => { ...prev, views: prev.views + 1 });`       | `user.update(prev => { ...prev, views: prev.views + 1 })` |
| **Add Item to a Nested Array**               | `user.tags.push('new-tag');`           | `user.tags.push('new-tag'); setUser({ ...user });`           | `user.tags.push('new-tag'); user = user;`                 |
| **Nested Property Assignment in Array Item** | `user.addresses[0].city = 'New City';` | `user.addresses[0].city = 'New City'; setUser({ ...user });` | `user.addresses[0].city = 'New City'; user = user;`       |

> ⚠️ **Note about performance**: Anchor is designed with efficiency and performance in mind. When used in a React
> application, Anchor leverages React's own `setState()` under the hood, ensuring optimal integration and performance
> with React's state management system.

> If used in a Svelte application, it behaves like a standard store-like object for
> Reactivity, enabling components to subscribe to state changes without burdening performance.

> Essentially, it handles
> state updates in a way that's idiomatic to each particular framework, ensuring both optimal interoperation and minimal
> performance overhead. This gives you the flexibility and directness of mutable state, but in a more intuitive manner
> and without additional performance costs.

## 📚 The Anchor Advantage

Anchor harnesses JavaScript's inherent mutability for direct and readable syntax. State changes are intuitive, even
derived states are handled with elegance and simplicity. With Anchor, embrace the flexibility of JavaScript and keep
your code free from unnecessary complexity.

## 💡 Features

- **Mutable States**: Experience the simplicity and intuitiveness of directly mutable states. Say goodbye to explicit
  setState calls.
- **Schema Validation**: Anchor supports schema validation for state objects. Define your schema and let Anchor handle
  the rest.
- **Circular Detection**: Anchor detects circular references and prevents infinite loops.
- **Framework Independent**: Effortlessly use Anchor with any front-end JavaScript framework. Keep things simple and
  consistent across React, Vue, Angular, or Svelte.
- **Store**: Easily maintain state between page refreshes or across user sessions and browser's tabs. Anchor
  abstracts away the manual management of LocalStorage or SessionStorage APIs.
- **In-Built History**: Track state history out-of-the-box. Implement complex undo/redo operations effortlessly.
- **Integrated API Helpers**: With Anchor, working with APIs becomes a breeze. Remote and Endpoint features offer great
  versatility and consistency throughout your application.
- **Real-Time Updates**: Anchor's Stream feature supports WebSocket communication in addition to standard fetch, making
  it a robust solution for real-time updates.

## 📝 In-Depth Comparison: Embrace Simplicity with Anchor

While many state management libraries advocate for immutability and require verbose syntax to manage state changes,
Anchor embraces JavaScript's inherent mutability. This maximizes code readability and maintainability by keeping
syntax direct and straightforward.

When managing state changes, you often want to derive new state from existing state. Anchor makes derived state
extremely intuitive. For instance, to increment a view count in React, you'd
use `setUser(previous => {...previous, views: previous.views + 1})`, whereas in Anchor, it is as simple
as `user.views += 1`.

Immutable state management brings to the table the concept of predictability, but it often complicates what ought to be
simple. It is beneficial until it becomes overkill. In most practical applications, there's no significant need for
immutability, and it prevents taking advantage of some of the simpler aspects of JavaScript.

Remember, **`Keep Simple Things Simple`**. With Anchor, you get the most natural and intuitive state management,
embracing the flexibility of JavaScript. Don't overburden your code and development with needless complexity.

## 🚀 Getting Started

Here's how you can start using Anchor in your project:

1. **Installing the Library**

```bash
npm install @beerush/anchor
```

2. **Using Anchor**

```typescript
import { anchor } from '@beerush/anchor';

const myState = anchor({ foo: 'bar', count: 1 });

myState.foo = 'baz';
myState.count += 1;

console.log(myState.foo); // baz
console.log(myState.count); // 2

```

## Usage Examples

### Svelte

```svelte

<script>
  import { anchor } from '@beerush/anchor';

  const state = anchor({ count: 1 });
</script>

<p>{$state.count}</p>
<button on:click={() => state.count += 1}>Increment</button>

```

### React

In a React application, you'd use the `useAnchor` hook.

> ⚠️ **Important**: When using Anchor in a React application, you must register the hooks at the initialization step,
> such as in your root component or entry file (`index.js` or `App.js`). This allows Anchor to use React's hooks while
> avoiding imposing `react` as a direct or peer dependency of the library.

1. Register the hooks

```jsx
import { setAnchorHook } from '@beerush/anchor';
import { useEffect, useRef, useState } from 'react';

setAnchorHook(useState, useEffect, useRef);

```

2. Next, declare your state using the useAnchor hook:

```jsx
import { useAnchor } from '@beerush/anchor';

export default function App() {
  const state = useAnchor({ count: 1 });

  return (
    <>
      <p>{ state.count }</p>
      <button onClick={ () => state.count += 1 }>Increment</button>
    </>
  );
}
```

## 📚 Learn More

Dive deeper into what Anchor can do for you. Check out our [documentation](https://beerush-id.github.io/anchor/).

## 🧭 Roadmap

Here's what we're currently working on and what's next for Anchor:

- ✅ Reactive Object – Ready.
- ✅ Circular Detection – Ready.
- 🟡 Schema Validation in State - Partially Complete.
- 🟡 Persistent Store - Partially Complete.
- 🟡 In-Memory Store - Partially Complete.
- 🟡 History – Partially Complete.
- 🟡 REST API Helper – Partially Complete.
- ⏳ Signal – Planned. Aims to expand the toolset beyond just working with objects, promising a more comprehensive
  solution for managing and reacting to state changes in your applications.

We're constantly working to add and improve features in Anchor. Your contributions, feedback, and bug reports are
invaluable in helping us shape the future of this project. Stay tuned for updates and enhancements!

## 🤝 Support and Contributions

If you need help, have found a bug, or want to contribute, please see
our [contributing guidelines](https://github.com/beerush-id/Anchor/blob/main/CONTRIBUTING.md). We appreciate and value
your input!

## 📄 License

Anchor is [MIT licensed](./LICENSE).
