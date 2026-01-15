---
title: "FAQ"
description: "Frequently Asked Questions about Anchor for SolidJS."
---

# Frequently Asked Questions

## General

::: details Does Anchor replace SolidJS? { open }
No. Anchor **enhances** SolidJS's already excellent reactivity system by adding direct mutation support, schema validation, and powerful state management patterns while preserving SolidJS's fine-grained reactivity.
:::

::: details Why do I need Anchor if SolidJS already has signals? { open }
SolidJS signals are excellent for primitives, but Anchor adds **direct mutation** for objects/arrays, **schema validation** with Zod, **two-way data binding**, and **async state management** with built-in status tracking.
:::

::: details Doesn't mutating state directly break reactivity? { open }
Not with Anchor. It uses **Proxies** to intercept mutations and trigger fine-grained reactivity automatically. Anchor implements its own reactivity system that integrates with SolidJS components.
:::

## Performance

::: details Does Anchor add overhead to SolidJS? { open }
Minimal. Anchor implements its own fine-grained reactivity system via `@anchorlib/core`, then integrates with SolidJS components. The proxy layer adds negligible overhead while providing significant developer experience improvements.
:::

::: details How does Fine-Grained Reactivity work? { open }
Anchor implements its own fine-grained reactivity system. When you mutate `state.count++`, only components reading `state.count` update—nothing else re-runs. This gives you the same fine-grained performance as SolidJS signals.
:::

::: details When should I use Anchor vs plain signals? { open }
- **Plain signals**: When you need SolidJS's native reactivity and don't need two-way binding (you'll pass getter/setter separately)
- **Anchor `mutable()`**: When you need direct mutation, two-way binding with `$bind()`, or complex nested state
- **Anchor `form()`**: Forms with validation
- **Anchor `query()`**: Async operations with status tracking

**Note**: Signals require passing `value={signal()}` and `onChange={setSignal}` separately. Anchor's `$bind()` provides true two-way binding.
:::

## Business & Impact

::: details Is it hard to learn? { open }
No. If you know JavaScript objects and SolidJS basics, you already know Anchor. Direct mutations (`state.count++`) are more intuitive than signal setters (`setCount(c => c + 1)`).
:::

::: details Does Anchor reduce development costs? { open }
Yes. By eliminating boilerplate for forms, async state, and two-way binding, teams ship features faster. Schema validation catches bugs at runtime before they reach production.
:::

::: details How does it affect AI coding? { open }
Anchor is **AI-friendly**. Its declarative patterns (direct mutations, automatic tracking) require fewer tokens than imperative signal management, making it ideal for AI-assisted development.
:::

::: details Is maintenance cheaper? { open }
Yes. Direct mutations are easier to understand than complex signal dependencies. Schema validation ensures data integrity, reducing runtime bugs in production.
:::

## Comparison

::: details How is this different from SolidJS stores? { open }
SolidJS stores use `createStore()` with immutable updates via `produce()`. Anchor uses **direct mutations** on proxies, which is simpler and more intuitive. Both provide fine-grained reactivity, but with different APIs.
:::

::: details Is this like MobX? { open }
Similar concept (observable proxies with automatic tracking). Both use proxies to intercept mutations and trigger reactivity. Anchor's `@anchorlib/core` implements its own tracking mechanism, then `@anchorlib/solid` integrates it with SolidJS's reactivity system.
:::

::: details Can I use Anchor with SolidJS signals? { open }
Yes! Anchor state (`mutable()`, `immutable()`) and SolidJS signals work side-by-side. Use `createEffect()` for signals and `effect()` for Anchor state. They're complementary, not exclusive.
:::

## Component Architecture

::: details Do I need special component wrappers? { open }
No. Anchor works with standard SolidJS function components. Only use `bindable()` HOC when you need two-way data binding props.
:::

::: details Can I use SolidJS control flow? { open }
Absolutely! Use `<Show>`, `<For>`, `<Switch>`, and `<Match>` as normal. Anchor state works seamlessly with all SolidJS control flow components.
:::

::: details Can I use SolidJS lifecycle hooks? { open }
Yes. `onMount`, `onCleanup`, and other SolidJS lifecycle hooks work perfectly with Anchor state. Use them as you normally would.
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
Anchor's `effect()` automatically tracks dependencies. Unlike SolidJS's `createEffect()`, it **only tracks Anchor state**. For SolidJS signals, use `createEffect()` instead.
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
Use **`form()`** with a Zod schema. It returns `[state, errors]` where `state` is mutable and `errors` updates automatically as you type.
:::

::: details Can I validate on submit only? { open }
Yes. Use `schema.safeParse(state)` in your submit handler. The `form()` helper validates on change by default, but you control when to check `errors`.
:::

::: details How do I show validation errors? { open }
Use `<Show when={errors.fieldName}>` to conditionally render error messages. Errors update automatically as the user types.
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
Use **`bindable()`** HOC to create components that accept `Bindable<T>` props, then use **`$bind(state, 'key')`** to pass a writable reference to the child component.
:::

::: details When should I use two-way binding? { open }
For reusable form inputs, custom controls, or any component that needs to modify parent state directly. For simple cases, just pass value and onChange callbacks.
:::

::: details Can I bind to primitives? { open }
Yes. Use `$bind(mutableRef)` for primitives (no key needed) or `$bind(object, 'key')` for object properties.
:::

## Ecosystem

::: details Does it work with SolidStart? { open }
Yes. Anchor state works in both client and server components. Just be careful with module-level state in SSR—use SolidJS Context for request-scoped state.
:::

::: details Can I use it with existing SolidJS libraries? { open }
Absolutely. Anchor is just state management—it works alongside any SolidJS library. Use it with SolidJS Router, SolidJS Meta, or any other ecosystem tool.
:::

::: details Does it work with TypeScript? { open }
Yes. Anchor is written in TypeScript with full type inference. Schemas provide runtime validation that complements TypeScript's compile-time checking.
:::
