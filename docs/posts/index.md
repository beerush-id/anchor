---
title: Posts
description: Articles, comparisons, and deep dives into the AIR Stack and IRPC.
sidebar: false
prev: false
next: false
---

# Posts

Explore articles, architectural comparisons, and deep dives into the AIR Stack and IRPC.

## Tutorials
Step-by-step guides that walk through building real features with AIR Stack libraries.

<div class="posts-grid">
  <a href="./building-forms-with-air-form.html" class="post-card">
    <article>
      <h3>Building Forms with AIR Form</h3>
      <p>A progressive tutorial from a two-field form to a production registration form with dynamic arrays, cross-field matching, and headless rendering.</p>
      <span class="read-more">Read tutorial &rarr;</span>
    </article>
  </a>
  <a href="./building-smart-form-components.html" class="post-card">
    <article>
      <h3>Building A Smart Form Component</h3>
      <p>Build a form engine from scratch — reactive state, Zod validation, and auto-wired inputs — to understand the architecture behind AIR Form.</p>
      <span class="read-more">Read tutorial &rarr;</span>
    </article>
  </a>
</div>

## AIR Stack Posts
Explore in-depth comparisons between the AIR Stack and popular meta-frameworks and routing libraries in the React ecosystem.

<div class="posts-grid">
  <a href="./airstack-vs-nextjs.html" class="post-card">
    <article>
      <h3>AIR Stack vs. Next.js</h3>
      <p>A comparison of full-stack architectures. See how the AIR Stack handles routing, data fetching, and rendering compared to the Next.js App Router.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>

  <a href="./airstack-vs-remix.html" class="post-card">
    <article>
      <h3>AIR Stack vs. Remix</h3>
      <p>Comparing mutation strategies and nested routing. Discover how AIR Stack's isomorphic functions contrast with Remix's web standard actions and loaders.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>

  <a href="./airstack-vs-tanstack.html" class="post-card">
    <article>
      <h3>AIR Stack vs. TanStack</h3>
      <p>Analyzing client-side routing and state. See how AIR Stack's unified router and RPC compares against assembling TanStack Router and Query.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>

  <a href="./airstack-vs-solidstart.html" class="post-card">
    <article>
      <h3>AIR Stack vs. SolidStart</h3>
      <p>A comparison of fine-grained reactive frameworks. See how AIR Stack's isomorphic functions differ from SolidStart's server actions and resources.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>
</div>

## IRPC Posts
Explore in-depth comparisons between IRPC and popular alternatives in the TypeScript ecosystem, including tRPC, Elysia, and NestJS.

<div class="posts-grid">
  <a href="./irpc-vs-trpc.html" class="post-card">
    <article>
      <h3>IRPC vs. tRPC</h3>
      <p>Comparing modern type-safe remote procedure calls. See how tRPC binds routers to HTTP endpoints while IRPC decouples function signatures for true isomorphic execution.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>

  <a href="./irpc-vs-elysia.html" class="post-card">
    <article>
      <h3>IRPC vs. Elysia</h3>
      <p>Comparing Isomorphic RPC with Elysia and Eden. See the difference between HTTP-driven type inference and pure function execution.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>

  <a href="./irpc-vs-nestjs.html" class="post-card">
    <article>
      <h3>IRPC vs. NestJS</h3>
      <p>Building an API? See how NestJS brings enterprise architecture to Node.js while IRPC streamlines full-stack communication with isomorphic functions.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>

  <a href="./irpc-vs-hono.html" class="post-card">
    <article>
      <h3>IRPC vs. Hono</h3>
      <p>Comparing Isomorphic RPC with Hono and its RPC client. See the difference between Edge-first Web Standards and pure function execution.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>
</div>

## AIR Form Posts
Explore in-depth comparisons between AIR Form and the most popular form validation and management libraries in the React and SolidJS ecosystems.

<div class="posts-grid">
  <a href="./airform-vs-react-hook-form.html" class="post-card">
    <article>
      <h3>AIR Form vs. React Hook Form</h3>
      <p>Comparing declarative schema-driven components with imperative register calls. See how autonomous components eliminate massive boilerplate.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>

  <a href="./airform-vs-formik.html" class="post-card">
    <article>
      <h3>AIR Form vs. Formik</h3>
      <p>Comparing fine-grained proxy reactivity against top-down virtual DOM re-renders. Discover how to achieve O(1) rendering performance.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>

  <a href="./airform-vs-tanstack-form.html" class="post-card">
    <article>
      <h3>AIR Form vs. TanStack Form</h3>
      <p>Comparing declarative schema-first API with render-prop driven configuration. See why autonomous contexts scale better than nested wrappers.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>

  <a href="./airform-vs-modular-forms.html" class="post-card">
    <article>
      <h3>AIR Form vs. Modular Forms</h3>
      <p>Comparing SolidJS specific form ecosystems with cross-framework reactive engines. See how AIR Form works identically in React and SolidJS.</p>
      <span class="read-more">Read article &rarr;</span>
    </article>
  </a>
</div>

<style>
.posts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
  margin-top: 32px;
}

.post-card {
  display: flex;
  flex-direction: column;
  background-color: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-bg-soft);
  border-radius: 12px;
  padding: 24px;
  text-decoration: none !important;
  color: inherit !important;
  transition: border-color 0.25s, transform 0.25s, box-shadow 0.25s;
}

.post-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.post-card h3 {
  margin: 0 0 12px 0;
  font-size: 1.4rem;
  font-weight: 600;
  border: none;
  padding: 0;
  color: var(--vp-c-text-1);
}

.post-card p {
  margin: 0;
  color: var(--vp-c-text-2);
  line-height: 1.6;
  font-size: 0.95rem;
  flex-grow: 1;
}

.read-more {
  display: inline-block;
  margin-top: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--vp-c-brand-1);
}
</style>
