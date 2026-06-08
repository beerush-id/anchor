---
name: air-form-react
description: "Use this skill when building web applications that require complex, state-driven forms using AIR Form and React. This skill is heavily modularized to prevent context pollution. Read ONLY the specific module that matches your current task using the view_file tool."
---

# AIR Form React Decision Router

AIR Form is a highly reactive form engine with React bindings. It leverages native proxy-based reactivity to provide deep state management, fine-grained validation, and dynamic form composition without unnecessary re-renders.

To work effectively without polluting your context, use the `view_file` tool to read the specific markdown file that aligns with your current task.

## Getting Started
- **When**: You need to scaffold a new form with Zod schema validation, bind it to a UI layout, handle submission lifecycle (pending, success, error), or wire up Submit and Reset buttons.
- **Action**: Read `contents/getting-started.md`

## Built-in Inputs
- **When**: You need to drop in pre-built, auto-wiring inputs (TextInput, NumberInput, DatePicker, Checkbox, Select, Radio, etc.), understand the three input contexts (standalone, direct form, field wrapper), or forward native HTML props.
- **Action**: Read `contents/inputs.md`

## Composition & Custom Fields
- **When**: You need to implement cross-field validation (password matching, date ranges), async validation (username taken checks), headless field rendering, dynamic array fields (FieldList), nested objects (dot-notation paths), custom inputs (createInput, formInput), or custom form action buttons.
- **Action**: Read `contents/composition.md`

## Configuration & Styling
- **When**: You need to establish global CSS defaults for forms, fields, labels, inputs, and action buttons using `configureForm`, apply per-input-type styling, or use local overrides.
- **Action**: Read `contents/configuration.md`

## Core API
- **When**: You need to use the engine directly without components (formState, formField, formInput, formFactory), build custom framework integrations, manually read/write field state, block/unblock submissions, or bridge context systems.
- **Action**: Read `contents/core-api.md`

## General Form
- **When**: You need to build dynamic forms from server responses, JSON schemas, or user configuration where field names are not known at compile time. Uses untyped `<Form>` and `<Field>` components instead of `createForm`.
- **Action**: Read `contents/general.md`

---
**CRITICAL INSTRUCTION**: Do NOT attempt to read all modules at once. Identify your exact problem domain from the list above, then use the `view_file` tool to read *only* that specific file.
