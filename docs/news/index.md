---
title: News & Releases
description: Stay up to date with the latest releases and updates to the AIR Stack ecosystem.
sidebar: false
prev: false
next: false
---

# News & Releases

Stay up to date with the latest releases and updates to the AIR Stack ecosystem.

<div class="posts-grid">
  <a href="./release-v1.2.html" class="post-card">
    <article>
      <h3>AIR Stack v1.2</h3>
      <p>SSR Refactor & Form Auto-Detection. Improved Vite SSR modularization, React context loss resolution, and AIR Form auto-detection for standalone inputs.</p>
      <span class="read-more">Read release notes &rarr;</span>
    </article>
  </a>

  <a href="./release-v1.1.html" class="post-card">
    <article>
      <h3>AIR Stack v1.1</h3>
      <p>Standalone HTTP Dispatch and AIR Form. Decoupled HTTP dispatcher, AIR Form ecosystem, and new headless utility components.</p>
      <span class="read-more">Read release notes &rarr;</span>
    </article>
  </a>

  <a href="./release-v1.html" class="post-card">
    <article>
      <h3>AIR Stack v1.0</h3>
      <p>Introducing AIR Stack. A full-stack TypeScript architecture unifying state management, isomorphic RPC, routing, reactive workflows, and universal SSR.</p>
      <span class="read-more">Read release notes &rarr;</span>
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
  margin: 0 0 12px 0 !important;
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
