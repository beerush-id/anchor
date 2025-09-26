---
title: 'React Context Sharing Tutorial: Anchor Global Context vs. React Context API'
description: "Learn how to share state in React applications using Anchor's Global Context and React's Context API. This tutorial covers when and how to use each for effective dependency injection."
keywords:
  - react context tutorial
  - anchor global context
  - dependency injection react
  - prop drilling
  - react context vs anchor context
  - state management react
  - anchor react tutorial
---

# Sharing State with Context in React

Learn how to share data throughout your application using both React's Context API and Anchor's Global Context.

## What You'll Learn

In this tutorial, you'll learn:

1. How to integrate React's Context API with Anchor for dependency injection.
2. How to use Anchor's Global Context for dependency injection.
3. When to use each approach for optimal state management.

## Understanding Context Systems

Context systems allow you to share data throughout your application without prop drilling. Both Anchor and React provide
powerful context mechanisms, and they can be used together to create flexible and scalable applications.

### React's Context API

React's Context API is a built-in feature that allows you to share values between components without explicitly passing
a prop through every level of the tree. This is the preferred method for dependency injection in most cases.

### Anchor's Global Context

Anchor's Global Context is a reactive dependency injection system that allows you to store and retrieve values by key.
It's particularly useful for sharing services, configurations, or global state throughout your application.

Anchor's global context is intended for easy context sharing without needing to create a specific context and wrap the
component using the Context Provider. The constraint is, it's a global context which means the whole app shares the same
place.

::: warning
Anchor's global context doesn't support NextJS server components at the moment. We will try to support it, but it's not a
priority at the moment.
:::

## Using React's Context API

React's Context API is perfect for sharing values that don't change frequently or when you want to leverage React's
built-in context system. When using React's context with Anchor, you pass the reactive state directly to the context,
which means you don't need to manually update the context value - it automatically updates when the state changes.

::: code-group

<<< @/react/tutorials/context-sharing/ReactContext.tsx

:::

::: details Try it Yourself

::: anchor-react-sandbox

<<< @/react/tutorials/context-sharing/ReactContext.tsx [active]

:::

::: tip In This Example

1. We create a React context using `createContext()`
2. We build a custom hook `useSettingsContext()` for easier consumption
3. We use `useAnchor` to manage the reactive state
4. We pass the reactive state directly to React's context provider using the `value` prop
5. Child components consume the context using `useContext()` or our custom hook
6. When the Anchor state changes, React's context automatically updates

:::

## Using Anchor's Global Context

Anchor's Global Context provides a reactive `Map` that can be used to store and retrieve values by key. Let's see how to
use it in a React application.

::: code-group

<<< @/react/tutorials/context-sharing/GlobalContext.tsx

:::

::: details Try it Yourself

::: anchor-react-sandbox

<<< @/react/tutorials/context-sharing/GlobalContext.tsx [active]

:::

::: tip In This Example

1. We use `useAnchor` to create a reactive state object
2. We directly set values in the context using `setContext()`
3. We retrieve values using `getContext()`
4. The context values are reactive and will update when the Anchor state changes
5. We don't need a provider component as with React's Context API

:::

## Combining Both Context Systems

You can combine both context systems to leverage the strengths of each. Use React's Context API for UI-related values
and Anchor's Global Context for services and cross-cutting concerns.

::: code-group

<<< @/react/tutorials/context-sharing/ComboContext.tsx

:::

::: details Try it Yourself

::: anchor-react-sandbox {class="preview-flex"}

<<< @/react/tutorials/context-sharing/ComboContext.tsx [active]

:::

::: tip In This Example

1. We use React's Context API for UI-related state (theme, sidebar state)
2. We use Anchor's Global Context for services (UserService)
3. We pass reactive state directly to React's context provider using the `value` prop
4. We directly set services in Anchor's context using `setContext`
5. Different components consume the appropriate context based on their needs
6. Both context systems automatically update when the Anchor state changes

:::

## Key Points for Context Sharing

1. **Use React Context for UI state**: Theme, user preferences, and other UI-related values
2. **Use Anchor Context for services**: API clients, utilities, and cross-cutting concerns
3. **Combine both when needed**: Leverage the strengths of each system
4. **Keep context values stable**: Avoid creating new objects on every render
5. **Use custom hooks**: Encapsulate context consumption logic in custom hooks for better reusability
6. **Pass reactive state to React context**: When using React's context with Anchor, pass the reactive state directly to
   avoid manual updates
