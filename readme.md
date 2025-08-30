<h1 align="center">Anchor - State Management for Humans, Built for Enterprise</h1>

<p align="center">A comprehensive state management solution that embraces JavaScript's natural mutability for effortlessly managing state — from simple todos to complex enterprise applications. Anchor handles state complexity with elegance, making any app's state a breeze.</p>

> 🚧 **Note:** Anchor is currently in its active development stage. While it is fully functional and ready for use, there
> could be occasional changes as we strive to improve and optimize it. Bug reports, suggestions, and contributions are
> very welcome and appreciated!

Don't forget to star ⭐ the project if you find it interesting and stay tuned for upcoming updates.

## 🏗️ The Anchor Ecosystem

Anchor is more than just a state management library - it's a comprehensive ecosystem for building modern applications. The ecosystem consists of:

### Core Packages

- **[@anchor/core](./packages/core)** - The heart of the ecosystem with reactive state management
- **[@anchor/react](./packages/react)** - React integration with hooks and components
- **[@anchor/vue](./packages/vue)** - Vue integration with composables
- **[@anchor/svelte](./packages/svelte)** - Svelte integration

### Storage Solutions

- **[@anchor/storage](./packages/storage)** - Persistent storage with multiple backends (memory, localStorage, sessionStorage, IndexedDB)

### Developer Tools

- **[@anchor/devtool](./packages/devtool)** - Developer tools for debugging and monitoring state changes

## 🧠 The Anchor Philosophy

Anchor is built on three core pillars:

### 1. True Immutability

Unlike other state management solutions, Anchor provides true immutability without the performance overhead of deep copying. You write intuitive "direct mutation" code within controlled "write contracts" without sacrificing state integrity.

### 2. Data Integrity

With built-in Zod schema validation, Anchor ensures your data always conforms to its defined structure and types, both during development and at runtime.

### 3. Fine-Grained Reactivity

Anchor's fine-grained reactivity means only components that depend on specific state changes are re-rendered, resulting in optimal performance even in complex applications.

## 💡 Enterprise-Grade Features

- **Mutable States**: Experience the simplicity and intuitiveness of directly mutable states. Say goodbye to explicit setState calls.
- **Schema Validation**: Built-in Zod schema validation ensures data integrity throughout your application lifecycle.
- **Cross-Framework Compatibility**: Use the same state logic across React, Vue, Svelte, and vanilla JavaScript.
- **Persistent Stores**: Maintain state between page refreshes or across user sessions with localStorage, sessionStorage, and IndexedDB support.
- **Built-In History**: Track state history out-of-the-box for undo/redo functionality.
- **Integrated API Helpers**: Work with REST APIs and server-sent events (SSE) with built-in optimistic updates.
- **Developer Tools**: Debug and monitor state changes with our dedicated devtools.

## 🚀 Getting Started

Here's how you can start using Anchor in your project:

1. **Installing the Library**

```bash
npm install @beerush/anchor
```

2. **Using Anchor**

```typescript
import { anchor } from '@anchor/core';

const myState = anchor({ foo: 'bar', count: 1 });

myState.foo = 'baz';
myState.count += 1;

console.log(myState.foo); // baz
console.log(myState.count); // 2
```

## 🤝 Support and Contributions

If you need help, have found a bug, or want to contribute, please see
our [contributing guidelines](./CONTRIBUTING.md). We appreciate and value
your input!

## 📄 License

Anchor is [MIT licensed](./LICENSE.md).
