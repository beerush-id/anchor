# **Getting Started**

Welcome to Anchor! This page will guide you through the first steps of using the framework, from understanding its
modern requirements to installing the right packages for your project.

## **Modern Platform**

Anchor is built on a modern, ESM-only architecture, which means it leverages the latest JavaScript features to provide
its superior performance and developer experience.

### **ESM Only**

Anchor is distributed exclusively as an **ESM (ECMAScript Module)**. This is the standard for modern
JavaScript development, providing benefits like tree-shaking and a cleaner module system. To use Anchor, your project
must support ESM.

### **Modern JavaScript**

Anchor's core engine relies heavily on modern JavaScript features like **`Proxy`**,
**`WeakMap`**, and **`WeakSet`**. These are essential for its unique approach to true immutability and fine-grained
reactivity. As a result, Anchor is only compatible with modern browsers and JavaScript environments. It's built for
today's web,
not yesterday's.

## **Packages**

Anchor's architecture is modular, allowing you to install only the packages you need. The core functionality is provided
by `@anchor/core`, with separate packages for framework bindings and built-in utilities.

### **Core**

The heart of Anchor's state management. This package contains the DSV model, true immutability, and
fine-grained reactivity.

::: code-group

```sh [Bun]
bun add @anchor/core
```

```sh [NPM]
npm install @anchor/core
```

```sh [Yarn]
yarn add @anchor/core
```

```sh [PNPM]
pnpm add @anchor/core
```

:::

### **Storage**

A built-in package that provides reactive bindings for `localStorage`, `sessionStorage`, and `IndexedDB`.

::: code-group

```sh [Bun]
bun add @anchor/storage
```

```sh [NPM]
npm install @anchor/storage
```

```sh [Yarn]
yarn add @anchor/storage
```

```sh [PNPM]
pnpm add @anchor/storage
```

:::

### **React**

The official bindings for integrating Anchor into your React applications.

::: code-group

```sh [Bun]
bun add @anchor/react
```

```sh [NPM]
npm install @anchor/react
```

```sh [Yarn]
yarn add @anchor/react
```

```sh [PNPM]
pnpm add @anchor/react
```

:::

### **Vue**

The official bindings for integrating Anchor into your Vue applications.

::: code-group

```sh [Bun]
bun add @anchor/vue
```

```sh [NPM]
npm install @anchor/vue
```

```sh [Yarn]
yarn add @anchor/vue
```

```sh [PNPM]
pnpm add @anchor/vue
```

:::

### **Svelte**

The official bindings for integrating Anchor into your Svelte applications.

::: code-group

```sh [Bun]
bun add @anchor/svelte
```

```sh [NPM]
npm install @anchor/svelte
```

```sh [Yarn]
yarn add @anchor/svelte
```

```sh [PNPM]
pnpm add @anchor/svelte
```

:::

## **Your First Project**

Now that you understand Anchor's philosophy and have the necessary packages, you're ready to create your first
application. We recommend starting with a simple project to see the power of the **DSV model** in action. You can find
detailed guides on installation and setup in the **"Installation"** page.
