---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

title: 'AIR Stack'
description: 'Zero-Boilerplate, AI-Native Full-Stack TypeScript Architecture. Anchor for reactivity, IRPC for transport, Router for navigation.'
keywords:
  - AIR Stack
  - Anchor
  - IRPC
  - Router
  - full-stack TypeScript
  - fine-grained reactivity
  - isomorphic remote procedure call
  - type-safe routing
  - server-side rendering
  - React
  - SolidJS

hero:
  name: 'AIR Stack'
  text: 'Zero-Boilerplate, AI-Native'
  tagline: 'Full-Stack TypeScript Architecture — state management, remote functions, routing, and SSR unified into one cohesive pipeline.'
  image: /airstack.svg

  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: Overview
      link: /overview

features:
  - icon: ⚡
    title: Reactive State
    details: Direct mutation with fine-grained reactivity. Schema validation, immutability contracts, and computed properties — built in.
  - icon: 🔌
    title: Network Transparency
    details: Declare a function, implement it, call it. IRPC abstracts HTTP, WebSocket, and BroadcastChannel into a single function call.
  - icon: 🛤️
    title: Reactive Routing
    details: Guards and data providers execute before the view renders. Route state re-evaluates when its dependencies change.
  - icon: 🌐
    title: Universal SSR
    details: One render function deploys to Bun, Node.js, Cloudflare Workers, and Deno. Request isolation handles concurrency natively.
  - icon: 🤖
    title: AI-Native
    details: Transparent architecture that both humans and AI reason about efficiently — fewer tokens, fewer wrong guesses, faster iteration.
  - icon: 🎯
    title: Framework Agnostic
    details: State, IRPC stubs, and route definitions are framework-agnostic. Only the view layer depends on React or Solid.
---
