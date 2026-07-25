---
title: 'UI Styling'
description: 'Learn how to manage UI styling in the AIR Stack. Discover patterns for theming, utility classes, and raw CSS, and know when to use each approach based on the problem.'
---

# Styling

Styling scales based on the scope of visual reuse, state complexity, and structural requirements.

### The Problem
Modern UI development is often plagued by **styling extremes**. Developers frequently create entire reactive components **just to reuse a string of CSS classes**. Alternatively, **markup becomes bloated** with complex utility classes making it **unreadable**, or styles are scattered across **multiple CSS files** forcing constant **context-switching** to understand a single element.

Each styling approach (**utilities**, **raw CSS**, **inline styles**) has specific pros and cons. The goal is not to find "the best" way to style, but to understand **which approach solves the problem at hand**.

### What This Page Covers
This page establishes a definitive **Styling Progression**. You will learn how to manage styling, **starting from simple inline classes**, when to **graduate to local variables** or factories, and when to **drop down into plain CSS** or **inline styles** based on the **architectural demand**.

## Theming

Before writing individual styles, you must establish how your application handles **design tokens** (`colors`, `spacing`, `typography`). 

### CSS Variables
Use CSS Variables for values that change at runtime, such as **light/dark mode**, tenant **branding**, or **user-defined themes**.

**Pros:** The browser handles the recalculation natively without requiring a Javascript runtime.
**Cons:** Harder to type-check strictly in Javascript, and can become difficult to track if cascaded deeply without a strict naming convention.

```css
:root {
  --color-surface: #ffffff;
  --color-border: #e5e7eb;
}

[data-theme="dark"] {
  --color-surface: #09090b;
  --color-border: #27272a;
}
```

### JS Variables
Use JS Variables for **static design tokens** that define your system but *never* change based on runtime context, or when strictly integrating with build-time tools.

**Pros:** Strongly typed, auto-completed in the IDE, and easily shared across non-CSS environments (e.g., passing a hex color to a Canvas chart library).  
**Cons:** Requires a Javascript runtime or build step to inject into the DOM.

```ts
export const Tokens = {
  radius: {
    sm: '0.125rem',
    md: '0.375rem',
    lg: '0.5rem',
  },
  zIndex: {
    dropdown: 100,
    modal: 50,
  }
} as const;
```

## Inline Classes
When a visual combination is used exactly once, keep it inline. This is your starting point.

```tsx
<section class="max-w-5xl mx-auto px-6 py-12 flex flex-col gap-8">
  <header class="border-b border-gray-200 pb-4">
    <h1 class="text-2xl font-semibold tracking-tight">Billing Settings</h1>
  </header>
  {/* ... */}
</section>
```

::: tip Why keep it inline?
Maintaining code is top-down. If you scatter single-use styles into global CSS classes or separate files, you force yourself into back-and-forth scanning between files for zero reusability return.
:::

## Local Variable Classes
When a visual combination is repeated **on the same page**, extract it locally. Do not immediately create a framework component just to share a class string.

:::	info Good Practice

Create a local variable with the class combination.

```tsx
const badgeClass = "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800";

<div class="flex items-center gap-2">
  <span class={badgeClass}>Paid</span>
  <span class={badgeClass}>Fulfilled</span>
</div>
```

:::

::: warning Bad Practice

Creating a component just to reuse classes.

```tsx
const Badge = ({ children }) => (
  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
    {children}
  </span>
);
```

:::

::: tip Why not global?
Extracting locally **prevents repetition** without **polluting the global namespace** or introducing the **navigating multiple files** problem for a strictly local visual concern.
:::

## Local Class Factory
When conditional styling logic gets complex in the same file, extract it to a local function. This prevents your markup from becoming bloated with unreadable inline ternaries.

::: info Good Practice

Extract to a local class factory.

```tsx
const getInvoiceStyle = (status: InvoiceStatus) => {
  switch (status) {
    case 'paid': return 'bg-green-50 border-green-200 text-green-900';
    case 'overdue': return 'bg-red-50 border-red-200 text-red-900';
    default: return 'bg-gray-50 border-gray-200 text-gray-900';
  }
};

<div class={`p-4 border rounded-lg ${getInvoiceStyle(invoice.status)}`}>
  {invoice.amount}
</div>
```

:::

::: warning Bad Practice

Bloated inline ternaries.

```tsx
<div class={`p-4 border rounded-lg ${invoice.status === 'paid' ? 'bg-green-50 border-green-200 text-green-900' : invoice.status === 'overdue' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-gray-50 border-gray-200 text-gray-900'}`}>
  {invoice.amount}
</div>
```

:::

### Using `classx`
To seamlessly manage conditional classes without manually writing switch statements or bloated ternaries, the `@anchorlib/core` library provides the `classx` utility. It accepts strings, arrays, or objects (where keys are classes and values are conditions).

::: code-group

```tsx [React]
import { classx } from '@anchorlib/react';
import { InvoiceBadge } from './InvoiceBadge.js'; // Example Anchor Component

// Static evaluation for native elements
<div className={classx('p-4 border rounded-lg', {
  'bg-green-50 border-green-200 text-green-900': invoice.status === 'paid',
  'bg-red-50 border-red-200 text-red-900': invoice.status === 'overdue',
  'bg-gray-50 border-gray-200 text-gray-900': invoice.status === 'pending'
})}>
  {/* Reactive binding for Anchor components */}
  <InvoiceBadge className={classx.use(() => ['badge', { active: invoice.isActive }])} />
</div>
```

```tsx [SolidJS]
import { classx } from '@anchorlib/solid';
import { InvoiceBadge } from './InvoiceBadge.js'; // Example Anchor Component

// SolidJS handles reactivity natively
<div class={classx('p-4 border rounded-lg', {
  'bg-green-50 border-green-200 text-green-900': invoice.status === 'paid',
  'bg-red-50 border-red-200 text-red-900': invoice.status === 'overdue',
  'bg-gray-50 border-gray-200 text-gray-900': invoice.status === 'pending'
})}>
  <InvoiceBadge class={classx('badge', { active: invoice.isActive })} />
</div>
```

:::

The `classx` utility automatically resolves the conditions and joins the truthful class names into a single string. For Anchor components in React, you can also use `classx.use()` to create fine-grained reactive class bindings that re-evaluate automatically when the underlying state changes.

## Utility Classes in CSS

When a combination of utility classes is repeated **across multiple pages** (e.g., **standard buttons**, **form inputs**, **cards**), graduate it to your **global CSS** by composing the utility classes.

### Tailwind `@utility`
The modern approach for creating custom utilities in Tailwind v4. This registers your composition as a first-class utility in the Tailwind engine.

**Pros:** Automatically generates all variants (`hover:form-input`, `md:form-input`). Respects Tailwind's internal CSS sorting.
**Cons:** Vendor lock-in. The syntax is invalid outside of the Tailwind compiler.

```css
@utility form-input {
  @apply w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500;
}
```

```tsx
<input type="email" class="form-input" placeholder="Enter your email" />
```

### Class Selectors
The standard approach for explicit, opt-in global styling when not using the `@utility` API.

**Pros:** Standard CSS portability. Best for complex structural rules that you don't intend to combine with Tailwind variants.
**Cons:** No automatic variants. You cannot use `md:form-input` in your HTML unless you explicitly define a media query or pseudo-class in the CSS.

```css
.form-input {
  @apply w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500;
}
```

```tsx
<input type="email" class="form-input" placeholder="Enter your email" />
```

### Attribute Selectors
Use attribute selectors when the style is strictly tied to a semantic HTML attribute or state, avoiding the need to manually toggle classes in Javascript.

```css
.form-input[aria-invalid="true"] {
  @apply border-red-500 focus:border-red-500 focus:ring-red-500;
}

.form-input[disabled] {
  @apply bg-gray-100 text-gray-500 cursor-not-allowed;
}
```

```tsx
<input 
  type="email" 
  class="form-input" 
  aria-invalid={state.error ? 'true' : undefined} 
  disabled={state.submitting} 
/>
```

### Advanced Selectors
Use advanced selectors (like `:has()`, `:is()`, `:where()`) to style complex component relationships globally without writing custom Javascript logic.

```css
/* Dim a pricing card if it contains an unchecked checkbox */
.pricing-card:has(input[type="checkbox"]:not(:checked)) {
  @apply opacity-75 grayscale hover:grayscale-0 transition-all;
}
```

```tsx
<label class="pricing-card border p-4 block cursor-pointer">
  <input type="checkbox" class="sr-only" checked={plan.selected} />
  <h4>{plan.name}</h4>
  <p>{plan.price}</p>
</label>
```

## Plain CSS
Graduate to plain CSS when utility classes fail you. Utilities are excellent for standard visual properties, but they become unreadable or physically impossible when dealing with complex grid layouts, deep pseudo-elements, or multi-step animations.

### Class Selectors
When the structural layout is simply too complex to express as a single string of utilities.

::: info Good Practice

Clean plain CSS for complex layouts.

```css
.dashboard-layout {
  display: grid;
  grid-template-columns: 1fr minmax(auto, 240px) minmax(auto, 320px);
  gap: 1rem 1.5rem;
  align-items: start;
}
```

:::

::: warning Bad Practice

Impossible to read in markup.

```tsx
<div class="grid grid-cols-[1fr_minmax(auto,240px)_minmax(auto,320px)] gap-x-6 gap-y-4 items-start">
```

:::

### Attribute Selectors
When applying plain CSS rules based on precise data states without relying on class toggling.

```css
.data-table-row[data-row-status="archived"] {
  text-decoration: line-through;
  opacity: 0.6;
}
```

### Advanced Selectors
When you need to perform "CSS wizardry" that utility classes cannot target effectively.

```css
/* Styling the thumb of a custom range slider */
.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--color-primary);
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}
```

## Inline Style
Use inline `style` properties **only** as an escape hatch for highly dynamic, Javascript-driven values that are calculated on the fly. It is impossible to pre-generate CSS classes for every possible value of a continuous input.

::: info Good Practice

Inline styles for continuous or dynamic external values.

```tsx
<div 
  class="relative w-full rounded-md border"
  style={{
    height: `${virtualList.totalHeight}px`,
    '--brand-color': user.tenant.primaryColor,
    transform: `translate3d(0, ${scroll.y}px, 0)`
  }}
>
  {/* Virtualized items */}
</div>
```

:::

::: warning Bad Practice

Trying to map dynamic values to discrete classes.

```tsx
<div class={`h-[${calculateHeight()}px] bg-[${user.favoriteColor}]`} />
```

:::

::: tip When to use inline styles?
If the value comes from a database, a scroll event, mouse coordinates, or mathematical calculations at runtime, it belongs in an inline style or a locally injected CSS Variable. Everything else belongs in a class.
:::

### Reactive Styles & Units
Managing inline styles dynamically often requires tedious string concatenation for CSS units. The `@anchorlib/core` library provides the `stylex` utility to automatically format units and handle reactive style objects gracefully.

::: code-group

```tsx [React]
import { stylex, $unit } from '@anchorlib/react';
import { VirtualList } from './VirtualList.js'; // Example Anchor Component

// Static evaluation for native elements
<div 
  className="relative w-full rounded-md border"
  style={stylex({
    height: virtualList.totalHeight, // Automatically becomes px
    width: $unit.percent(100), // Explicit unit assignment
    '--brand-color': user.tenant.primaryColor,
    opacity: user.isActive ? 1 : 0.5 // Ignores units for unitless properties
  })}
>
  {/* Reactive binding for Anchor components */}
  <VirtualList style={stylex.use(() => ({ height: virtualList.visibleHeight }))} />
</div>
```

```tsx [SolidJS]
import { stylex, $unit } from '@anchorlib/solid';
import { VirtualList } from './VirtualList.js'; // Example Anchor Component

// SolidJS handles reactivity natively
<div 
  class="relative w-full rounded-md border"
  style={stylex({
    height: virtualList.totalHeight, // Automatically becomes px
    width: $unit.percent(100), // Explicit unit assignment
    '--brand-color': user.tenant.primaryColor,
    opacity: user.isActive ? 1 : 0.5 // Ignores units for unitless properties
  })}
>
  <VirtualList style={stylex({ height: virtualList.visibleHeight })} />
</div>
```

:::

The `stylex` utility ensures numeric values automatically receive `px` units when required (ignoring unitless properties like `opacity`). To explicitly use a different unit (like `%`, `em`, or `vh`), use the `$unit` helper. Similar to classes, `stylex.use()` is available for Anchor components in React to provide fine-grained reactive style bindings.

## Learn More

- [Static UI](./static) — When UI should remain inline, and when it should graduate
- [Reactive UI](./view) — Presenting reactive data without owning it
- [Component](./component) — When a concern needs its own state, behavior, and reactivity
- [Form Components](./form) — User-driven form components with built-in validation
