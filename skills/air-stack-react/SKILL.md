---
name: air-stack-react
description: "Use this skill when building web applications, backend APIs, or reusable front-end/backend libraries using the AIR Stack (Anchor, IRPC, Router) and React. This skill is heavily modularized to prevent context pollution. Read ONLY the specific module that matches your current task using the view_file tool."
---

# AIR Stack React Decision Router

The AIR Stack is an isomorphic architecture encompassing Isomorphic RPC (IRPC), Workflows, fine-grained State Management, Routing, and UI components. 

To work effectively without polluting your context, use the `view_file` tool to read the specific markdown file that aligns with your current task.

### Installation & Setup
- **When**: You need to initialize a new AIR Stack project from scratch or using the `degit` templates, you need to know which core packages to install, or you need to see the project file structures and global conventions.
- **Action**: Read `contents/00-installation.md`

### Isomorphic RPC (IRPC)
- **When**: You need to create type-safe backend functions, handle context injection (e.g. auth tokens), stream data, run isomorphic validation, or configure client transports (HTTP vs Web Worker).
- **Action**: Read `contents/01-irpc.md`

### Workflows (@anchorlib/core)
- **When**: You need to orchestrate complex, multi-step asynchronous processes, handle conditional branching in business logic, inject schema validation between steps, or track pipeline execution state in the UI.
- **Action**: Read `contents/02-workflows.md`

### State Management
- **When**: You need to handle fine-grained reactivity, mutate nested objects/arrays directly, create derived computed properties, establish read/write immutable contracts, track async queries, or manage side-effects.
- **Action**: Read `contents/03-state-management.md`

### Router (@anchorlib/router)
- **When**: You need to manage client/server navigation, load data before rendering via `providers`, protect routes with reactive `guards`, handle redirects, or bind route parameters to UI components.
- **Action**: Read `contents/04-router.md`

### Universal SSR
- **When**: You need to configure Server-Side Rendering (SSR) boundaries, handle request isolation, or inject server context across the application.
- **Action**: Read `contents/05-universal-ssr.md`

### User Interface & Components (@anchorlib/react)
- **When**: You need to build UI components, handle prop bindings (1-way `$use` vs 2-way `$bind`), apply conditional styling/classes, or isolate fast-updating reactive views using `snippet` and `template`.
- **Action**: Read `contents/06-user-interface.md`

### Form Architecture
- **When**: You need to build form coordinators, handle two-way bindings for inputs, manage internal parse buffers, or create strongly-typed form factories using Zod schemas.
- **Action**: Read `contents/07-form-architecture.md`

### Headless Composition
- **When**: You need to decouple complex logic from the UI tree, create headless state machines, abstract side-effects, or encapsulate pure domain logic for maximum reusability.
- **Action**: Read `contents/08-headless-composition.md`

---
**CRITICAL INSTRUCTION**: Do NOT attempt to read all modules at once. Identify your exact problem domain from the list above, then use the `view_file` tool to read *only* that specific file.
