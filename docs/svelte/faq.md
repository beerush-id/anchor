---
title: "FAQ"
description: "Frequently Asked Questions about Anchor for Svelte."
---

# Frequently Asked Questions

## General

::: details Does Anchor replace Svelte? { open }
No. Anchor **enhances** Svelte by adding direct mutation support, schema validation, and powerful state management patterns while working seamlessly with Svelte's reactivity system.
:::

::: details Why use Anchor when Svelte 5 runes already support direct mutation? { open }
Svelte 5 runes (`$state()`, `$derived()`) are great for reactive state! Anchor complements them by adding:

**What Anchor Adds:**
- **Schema Validation**: Runtime type checking with Zod - enforce data integrity beyond TypeScript
- **Async State**: `query()`, `fetchState()`, `streamState()` with automatic status tracking
- **Form Handling**: `form()` with automatic validation and error tracking
- **Immutability Patterns**: `immutable()` + `writable()` for controlled shared state access
- **Persistence**: `persistent()`, `session()` for localStorage/sessionStorage sync
- **Portability**: Business logic works across React, SolidJS, Svelte, vanilla JS (`@anchorlib/core`)

**When to Use What:**
- **Runes**: Simple reactive state, UI-focused logic
- **Anchor**: Validation, async operations, forms, portable business logic, advanced patterns

Think of Anchor as a **state management library** that adds features on top of runes, not a replacement.
:::

## Performance

::: details Does Anchor add overhead to Svelte? { open }
Minimal. Anchor implements its own fine-grained reactivity system via `@anchorlib/core`, then integrates with Svelte components. The proxy layer adds negligible overhead while providing significant developer experience improvements.
:::

::: details How does Fine-Grained Reactivity work? { open }
Anchor implements its own fine-grained reactivity system. When you mutate `state.count++`, only components reading `state.count` update—nothing else re-runs. This gives you the same fine-grained performance as Svelte stores.
:::

::: details When should I use Anchor vs runes vs stores? { open }
- **Runes (`$state()`)**: Simple reactive state with direct mutation
- **Anchor `mutable()`**: When you need schema validation, immutability patterns, or portable business logic
- **Anchor `form()`**: Forms with validation
- **Anchor `query()`**: Async operations with status tracking
- **Svelte stores**: Legacy pattern for Svelte 4 compatibility or when you need store contracts

**Note**: Both runes and Anchor support direct mutations. Choose Anchor when you need validation, async handling, or portability.
:::

## Business & Impact

::: details Is it hard to learn? { open }
No. If you know JavaScript objects and Svelte 5 runes, you already know Anchor. The API is similar to runes but with added features like schema validation and async state management.
:::

::: details Does Anchor reduce development costs? { open }
Yes. By eliminating boilerplate for forms, async state, and providing direct mutations, teams ship features faster. Schema validation catches bugs at runtime before they reach production.
:::

::: details How does it affect AI coding? { open }
Anchor is **AI-friendly**. Its declarative patterns with schema validation and automatic async state management reduce boilerplate, making it ideal for AI-assisted development.
:::

::: details Is maintenance cheaper? { open }
Yes. Schema validation catches bugs at runtime, and immutability patterns enforce clear contracts for shared state. This reduces runtime bugs and makes code easier to maintain.
:::

## Comparison

::: details How is this different from Svelte stores? { open }
Svelte stores require immutable updates: `$store = newValue` or `store.update(v => newValue)`. Anchor uses **direct mutations** on proxies: `state.count++`. Both provide fine-grained reactivity, but with different APIs.
:::

::: details Is this like MobX? { open }
Similar concept (observable proxies with automatic tracking). Both use proxies to intercept mutations and trigger reactivity. Anchor's `@anchorlib/core` implements its own tracking mechanism, then `@anchorlib/svelte` integrates it with Svelte's component system.
:::

::: details Can I use Anchor with Svelte stores? { open }
Yes! Anchor state (`mutable()`, `immutable()`) and Svelte stores work side-by-side. Use `$:` reactive statements for stores and `effect()` for Anchor state. They're complementary, not exclusive.
:::

## Component Architecture

::: details Do I need special component wrappers? { open }
No. Anchor works with standard Svelte components. No HOCs, no wrappers needed.
:::

::: details Can I use Svelte control flow? { open }
Absolutely! Use `{#if}`, `{#each}`, `{#await}` as normal. Anchor state works seamlessly with all Svelte control flow directives.
:::

::: details Can I use Svelte lifecycle hooks? { open }
Yes. `onMount`, `onDestroy`, and other Svelte lifecycle hooks work perfectly with Anchor state. Use them as you normally would.
:::

## State Management

::: details Is mutable state safe? { open }
Yes. Anchor uses **`immutable()` + `writable()`** for shared state, enforcing read-only public interfaces with controlled write access. This ensures unidirectional data flow.
:::

::: details Does it track nested properties? { open }
Yes. **`mutable()`** tracks nested objects and arrays by default. Mutating `state.user.name` only updates components reading that specific property.
:::

::: details Can I validate my state? { open }
Yes. Anchor supports **Zod schemas** for both `mutable()` and `form()`. Invalid data is rejected at runtime, ensuring type safety beyond TypeScript.
:::

## Reactivity System

::: details How do effects work? { open }
Anchor's `effect()` automatically tracks dependencies. Unlike Svelte's `$:` reactive statements, it **only tracks Anchor state**. For Svelte stores, use `$:` reactive statements instead.
:::

::: details Do I need dependency arrays? { open }
No. Effects track dependencies automatically based on what you read during execution. No manual arrays, no stale closures.
:::

::: details How do I stop tracking? { open }
Use **`untrack()`** to read data without subscribing to it. This is useful for reading configuration or performing side effects without creating dependencies.
:::

::: details What if I need a copy of the state? { open }
Use **`snapshot()`** to create a non-reactive deep clone. This is useful for logging, serialization, or passing data to external APIs.
:::

## Forms & Validation

::: details How do I handle forms? { open }
Use **`form()`** with a Zod schema. It returns `[state, errors]` where `state` is mutable and `errors` updates automatically as you type. Use `bind:value` for two-way binding.
:::

::: details Can I validate on submit only? { open }
Yes. Use `schema.safeParse(state)` in your submit handler. The `form()` helper validates on change by default, but you control when to check `errors`.
:::

::: details How do I show validation errors? { open }
Use `{#if errors.fieldName}` to conditionally render error messages. Errors update automatically as the user types.
:::

## Async Operations

::: details How do I handle async data? { open }
Use **`query()`** for general async operations, **`fetchState()`** for HTTP requests, or **`streamState()`** for streaming responses. All include automatic status tracking.
:::

::: details Do I need to manage loading states manually? { open }
No. `query()`, `fetchState()`, and `streamState()` all provide a `status` property ('idle' | 'pending' | 'success' | 'error') that updates automatically.
:::

::: details How do I cancel requests? { open }
Async functions receive an `AbortSignal` parameter. Pass it to `fetch()` and Anchor handles cancellation automatically when a new request starts or the component unmounts.
:::

## Two-Way Binding

::: details How do I do two-way binding? { open }
Use Svelte's native **`bind:value`** directive with Anchor state. No special helpers needed—Svelte's binding works perfectly with Anchor's mutable state.
:::

::: details When should I use two-way binding? { open }
For form inputs, use `bind:value`, `bind:checked`, etc. Svelte's binding directives work seamlessly with Anchor state, providing automatic two-way synchronization.
:::

::: details Can I bind to nested properties? { open }
Yes. Use `bind:value={state.user.name}` to bind directly to nested properties. Anchor tracks the mutation and updates automatically.
:::

## Ecosystem

::: details Does it work with SvelteKit? { open }
Yes. Anchor state works in both client and server components. Just be careful with module-level state in SSR—use Svelte context for request-scoped state.
:::

::: details Can I use it with existing Svelte libraries? { open }
Absolutely. Anchor is just state management—it works alongside any Svelte library. Use it with SvelteKit, Svelte Routing, or any other ecosystem tool.
:::

::: details Does it work with TypeScript? { open }
Yes. Anchor is written in TypeScript with full type inference. Schemas provide runtime validation that complements TypeScript's compile-time checking.
:::
