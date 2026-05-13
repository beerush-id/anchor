---
title: 'Component: Composition'
description: 'Coordinating autonomous components into complete application interfaces.'
---

# Composition

When every component is an autonomous unit, the parent's role is **coordination, not control**. Parent components place child components and bind to their state — they don't dictate what each child renders or when it updates.

Components communicate through **reactive contracts** — binding and context — rather than prop drilling. Each unit remains independently testable, independently replaceable, and independently reactive.
