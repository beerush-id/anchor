---
title: AIR Stack v1.1 — Standalone HTTP Dispatch and AIR Form
description: Standalone HTTP dispatch for IRPC, simplified declare signatures, cookie context validation, and the first release of AIR Form.
date: 2025-06-04
---

# AIR Stack v1.1 — Standalone HTTP Dispatch and AIR Form

**v1.1.0** — [GitHub](https://github.com/beerush-id/airstack) | MIT Licensed

This release introduces standalone HTTP dispatch for IRPC, simplifies declare signatures and form state handling, and ships AIR Form — the first published library built on the AIR Stack.

## Standalone HTTP Dispatch

IRPC's HTTP transport now supports standalone dispatch mode, giving you full HTTP lifecycle control. The `declare` signatures are also simplified, with less ceremony when defining function stubs. This is useful when IRPC runs outside the Vite SSR plugin — standalone Bun/Node servers, edge workers, or any environment where you manage the HTTP layer yourself.

## Cookie Context Validation

Server-side cookie mutations now enforce writable context validation. Attempting to mutate cookies outside a writable context (e.g., outside a request scope) throws a clear error instead of silently failing. This prevents bugs where cookie writes are lost because they happened outside the SSR request lifecycle.

## AIR Form

The headline addition: [`@airlib/form`](https://www.npmjs.com/package/@airlib/form), [`@airlib/react-form`](https://www.npmjs.com/package/@airlib/react-form), and [`@airlib/solid-form`](https://www.npmjs.com/package/@airlib/solid-form) — now published on npm.

AIR Form is a reactive and declarative form engine built on Anchor's reactivity. Define a Zod schema, and the engine handles validation, dirty tracking, cross-field matching, error mapping, and submission lifecycle.

::: code-group

```tsx [React]
const UserForm = createForm(userSchema);

export const EditUser = setup<{ user: User }>((props) => {
  return render(() => (
    <UserForm value={props.user} onSubmit={(data, changes) => save(data)}>
      <UserForm.Field name="name" label="Name">
        <TextInput />
      </UserForm.Field>
      <UserForm.Field name="email" label="Email">
        <EmailInput />
      </UserForm.Field>
      <FormSubmit>Save</FormSubmit>
    </UserForm>
  ));
});
```

```tsx [SolidJS]
const UserForm = createForm(userSchema);

export const EditUser = setup<{ user: User }>((props) => {
  return (
    <UserForm value={props.user} onSubmit={(data, changes) => save(data)}>
      <UserForm.Field name="name" label="Name">
        <TextInput />
      </UserForm.Field>
      <UserForm.Field name="email" label="Email">
        <EmailInput />
      </UserForm.Field>
      <FormSubmit>Save</FormSubmit>
    </UserForm>
  );
});
```

:::

Three packages, one API surface:

- **`@airlib/form`** — framework-agnostic form engine (schema, state, validation)
- **`@airlib/react-form`** — React components (`Form`, `Field`, `FieldList`, `FormSubmit`, `FormReset`, all inputs)
- **`@airlib/solid-form`** — SolidJS components (same API, fine-grained reactivity)

Full documentation at [airlib.dev/airlib/form](https://airlib.dev/airlib/form/).

## Bug Fixes

- **SolidJS render props** — `setup` components now correctly detect function children vs static JSX in Solid, using `createMemo` for reactive branching.

## SSR Improvements

- **Dynamic core loading** — `vite-ssr` now loads core context utilities via `ssrLoadModule`, removing hard-coded imports and improving compatibility with different module resolutions.
- **Simplified cookie handling** — removed the cookie context middleware from the IRPC HTTP router. Cookie propagation is now handled entirely through the SSR render pipeline.

## Documentation

- Universal SSR and ISR documentation
- Framework and RPC comparison articles
- Smart form component tutorial with interactive demo
- Comprehensive AIR Form documentation (Getting Started, Form Inputs, Composition, General Form, Core API)

## Get Started

```sh
bun add @anchorlib/core@^1.1.0 @anchorlib/react@^1.1.0
bun add @airlib/form @airlib/react-form
```

[GitHub](https://github.com/beerush-id/airstack) · [Documentation](https://airlib.dev) · [AIR Form](https://airlib.dev/airlib/form/)
