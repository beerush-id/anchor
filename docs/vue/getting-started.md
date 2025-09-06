# **Anchor - Vue**

## **Getting Started**

Anchor's Vue integration is designed to be as seamless and powerful as Vue's own reactivity system. This guide will walk
you through setting up Anchor in your Vue project and explain its role in your application architecture.

## **Disclaimer**

It's important to understand that the Anchor Vue integration is not intended to replace Vue's built-in reactivity
system, which is already incredibly powerful and efficient. Instead, it's designed to provide a cohesive bridge between
Vue components and Anchor's **DSV (Data-State-View)** ecosystem.

The primary purpose of this package is to allow your Vue application to share a single, stable state with other
frameworks or cross-platform applications. This ensures data consistency and allows you to build a true, full-stack,
real-time application using the same state model across all of your projects.

## Installation

To get started with Anchor in your Vue project, install the required packages:

::: code-group

```bash [NPM]
npm install @anchor/vue
```

```bash [Yarn]
yarn add @anchor/vue
```

```bash [PNPM]
pnpm add @anchor/vue
```

```bash [Bun]
bun add @anchor/vue
```

:::

## Basic Setup

After installation, you can start using Anchor in your Vue components. Here's a simple example:

```vue
<script setup>
import { anchorRef } from '@anchor/vue';

// Create a reactive state
const state = anchorRef({
  count: 0,
  name: 'Anchor Vue',
});
</script>

<template>
  <div>
    <h1>{{ state.name }}</h1>
    <p>Count: {{ state.count }}</p>
    <button @click="state.count++">Increment</button>
  </div>
</template>
```

## Core Concepts

Anchor Vue provides seamless integration with Vue's reactivity system through special **`*Ref`** functions that return
Vue-compatible refs while leveraging Anchor's powerful state management capabilities.

This assumes you have already read and have a basic understanding of Anchor's core concepts. The purpose of this
documentation is not to reteach the **DSV (Data-State-View)** model or explain fine-grained reactivity; it is to serve
as a translation layer between Anchor's core APIs and the Vue-specific integration APIs.

We intentionally keep this documentation minimal. Its goal is to provide a clear mapping so you can immediately begin
using Anchor's powerful features within your Vue application, such as `anchor(init, options)` becoming `anchorRef(init, options)`.

::: warning IMPORTANT

If you have not yet read the **Overview**, **Performance**, or **Philosophy** pages, we highly recommend you do so
before proceeding. This will give you the necessary context to understand why Anchor works the way it does and how to
best leverage its features.

:::

## Next Steps

After setting up your basic integration, explore the [Usage Guide](./usage) to learn about more advanced features and
API usage.
