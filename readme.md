<h1 align="center">AIR Stack</h1>

<p align="center">Cost Efficient, AI-Native Web Development Libraries</p>

<p align="center">
  <img src="./cover.jpg" alt="AIR Stack Cover" width="100%" />
</p>

<p align="center">The complete stack for modern web development: Anchor (fine-grained state management), IRPC (type-safe APIs with automatic batching), and Reactive UI (React, Solid, Svelte, Vue).</p>

## Why AIR Stack?

Modern web development forces you to choose between developer experience and performance, between type safety and productivity, between framework flexibility and infrastructure costs. AIR Stack eliminates these trade-offs.

**The Problem:**

- **State Management Complexity**: Prop drilling, context hell, and wasted renders plague traditional approaches
- **API Boilerplate Overload**: REST requires endless routes, serialization, client code, and manual type definitions
- **Performance vs Cost**: More HTTP connections mean slower apps and higher infrastructure costs
- **Framework Lock-in**: State management solutions tie you to specific frameworks, making migrations painful

**The Solution:**

AIR Stack addresses these challenges with an integrated ecosystem that delivers exceptional performance, minimal boilerplate, and true framework agnosticism. Build faster, ship cheaper, scale effortlessly.

## What is AIR Stack?

AIR Stack is a revolutionary approach to building web applications that consists of three integrated components:

- **A = Anchor** (Fine-grained state management)
- **I = IRPC** (Type-safe APIs with automatic batching)
- **R = Reactive UI** (React, Solid, Svelte, Vue, vanilla JS)

Together, these components implement the **DSV (Data-State-View) model**, creating a clean separation of concerns where external data flows through a central immutable state to your view layer.

### Architecture

The DSV model eliminates state synchronization issues and provides predictable, scalable state management:

1. **Data**: External sources (APIs via IRPC, databases, user input)
2. **State**: Central state managed by Anchor
3. **View**: Components that observe and render state

This architecture removes prop drilling, context complexity, and framework coupling while maintaining type safety and developer productivity.

## Features

### Fine-Grained Reactivity

Anchor's fine-grained reactivity ensures only components that depend on changed state re-render, eliminating wasted renders and improving application performance.

### Type-Safe APIs with Zero Boilerplate

IRPC eliminates API boilerplate by making remote functions look and feel like local functions. End-to-end TypeScript support with automatic type inference means no manual type definitions, no routes, no endpoints.

### Automatic Request Batching

IRPC's automatic batching protocol reduces HTTP connections dramatically, delivering faster performance and significantly lower infrastructure costs. Multiple function calls batch into a single HTTP request, reducing network overhead and server load.

### True Immutability

Proxy-based write contracts guarantee that illegal mutations cannot enter the state, ensuring data integrity and predictable behavior without performance penalties.

### Framework Agnostic

First-class support for React, Solid, Svelte, Vue, and vanilla JavaScript/TypeScript. Use the same state management and API layer across any framework, making migrations seamless.

### Built-in Toolkit

Includes optimistic UI, history tracking, reactive storage, and async state out of the box. Additional libraries include AIR Object (Headless Kit), AIR View (UI Kit), and AIR Link (IRPC libraries). Everything you need to build production-ready applications without additional dependencies.

### Cost Efficiency

Reduced HTTP connections translate directly to lower infrastructure costs and reduced token usage in generative AI applications. Serve more users with fewer servers while optimizing API costs.

## Components

### Anchor: State Management

The heart of the ecosystem with reactive state management based on the DSV model. Anchor provides fine-grained reactivity, flexible state primitives, and a comprehensive toolkit for managing application state.

**Core Package:**
- [@anchorlib/core](./packages/core) - Framework-agnostic reactive state management

**Framework Integrations:**
- [@anchorlib/react](./packages/react) - React integration with hooks and components
- [@anchorlib/solid](./packages/solid) - Solid integration with reactive state
- [@anchorlib/svelte](./packages/svelte) - Svelte integration
- [@anchorlib/vue](./packages/vue) - Vue integration with composables

**Storage Solutions:**
- [@anchorlib/storage](./packages/storage) - Persistent storage with multiple backends (memory, localStorage, sessionStorage, IndexedDB)

### IRPC: Type-Safe API Layer

Isomorphic Remote Procedure Call framework that bridges the gap between frontend state and backend data. IRPC's automatic batching and type-safe protocol eliminate API complexity while delivering exceptional performance.

**Core Packages:**
- [@irpclib/irpc](./irpclib/irpc) - Core IRPC framework with automatic batching
- [@irpclib/http](./irpclib/http) - HTTP transport implementation

**Key Features:**
- **Zero Boilerplate**: No routes, no endpoints, no client code - just declare functions and call them
- **Automatic Batching**: Intelligent request batching with configurable debounce reduces network overhead
- **Intelligent Caching**: Built-in caching with configurable TTL and manual invalidation support
- **Timeout Management**: Configurable timeouts per function or globally with automatic error handling
- **Schema Validation**: Optional Zod integration for runtime input/output validation
- **Context Management**: Built-in async context support for request-scoped data (headers, auth, etc.)
- **Error Handling**: Standardized error codes and messages with graceful degradation
- **Semantic Versioning**: Auto-versioning synced with package.json for API version management
- **Transport Abstraction**: Protocol-agnostic design supports HTTP, WebSocket, and custom transports

### Reactive UI: Universal Framework Support

Works seamlessly with any reactive UI framework, providing a consistent state management and API layer regardless of your view technology. Build once, run everywhere.

**Supported Frameworks:**
- React
- Solid
- Svelte
- Vue
- Vanilla JavaScript/TypeScript

## Get Started

**Documentation**: [https://anchorlib.dev/docs](https://anchorlib.dev/docs)

**Quick Start Guides:**
- [AIR Stack Overview](https://anchorlib.dev/docs/overview)
- [Anchor Getting Started](https://anchorlib.dev/docs/getting-started)
- [IRPC Documentation](https://anchorlib.dev/docs/irpc)
- [Framework-Specific Guides](https://anchorlib.dev/docs/react/getting-started)

**Resources:**
- [GitHub Repository](https://github.com/beerush-id/anchor)
- [Contributing Guidelines](./CONTRIBUTING.md)
- [IRPC Specification](https://anchorlib.dev/docs/irpc/specification)

## Support and Contributions

If you need help, have found a bug, or want to contribute, please see our [contributing guidelines](./CONTRIBUTING.md). We appreciate and value your input.

Star the project if you find it valuable and stay tuned for upcoming updates.

## License

AIR Stack is [MIT licensed](./LICENSE.md).
