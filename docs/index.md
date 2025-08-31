---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: 'Anchor'
  text: 'State Management For Humans, Built For Enterprise Apps'
  tagline: Anchor not just makes apps work, but also efficient.
  image: /anchor-icon-raw.svg

  actions:
    - theme: brand
      text: Getting Started
      link: /getting-started
    - theme: alt
      text: Learn More
      link: /overview

features:
  - title: True Immutability
    icon: ▣
    details: A true immutable model without performance overhead associated with deep copying large state trees.
  - title: Data Integrity
    icon: ◯
    details: Ensures your data always conforms to its defined structure and types, both during development
      and at runtime.
  - title: Fine-Grained Reactivity
    icon: ↜
    details: When a piece of state changes, only the exact components that depend on that specific piece of state are re-rendered.
---
