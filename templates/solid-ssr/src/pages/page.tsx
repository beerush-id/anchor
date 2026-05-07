import { Meta, page, Title } from '@anchorlib/solid';
import airstackLogo from '../assets/airstack.svg';
import solidLogo from '../assets/solid.svg';
import viteLogo from '../assets/vite.svg';
import { Counter } from '../components/Counter.js';
import { indexRoute } from './route.js';

export const RootPage = page(indexRoute).render(() => (
  <>
    <Title>AIR Stack</Title>
    <Meta
      name="description"
      content="Build high-performance, scalable, and highly maintainable Solid applications powered by Anchor — fine-grained reactivity, zero boilerplate, SSR-ready."
    />

    <div class="logo-row">
      <a href="https://airlib.dev" class="logo-link logo-anchor" target="_blank" rel="noreferrer">
        <img src={airstackLogo} alt="AIR Stack logo" />
      </a>
      <span class="logo-separator">+</span>
      <a href="https://vite.dev" class="logo-link logo-vite" target="_blank" rel="noreferrer">
        <img src={viteLogo} alt="Vite logo" />
      </a>
      <span class="logo-separator">+</span>
      <a href="https://solidjs.com" class="logo-link logo-solid" target="_blank" rel="noreferrer">
        <img src={solidLogo} alt="Solid logo" />
      </a>
    </div>

    <h1 class="hero-heading">
      <span class="brand-anchor">AIR Stack</span>
    </h1>

    <p class="hero-subtitle">Zero Boilerplate, AI Native Stack</p>

    <div class="card">
      <Counter />
    </div>

    <div class="features">
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3 class="feature-title">Write Logic, Not Glue</h3>
        <p class="feature-desc">
          Define your data, mutate it directly, and the UI updates itself. No hooks, no dependency arrays, no re-render
          optimization.
        </p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🎯</div>
        <h3 class="feature-title">Surgical Updates</h3>
        <p class="feature-desc">
          Only the exact DOM fragment reading changed state re-renders. Everything else stays still. No full-tree
          reconciliation.
        </p>
      </div>
      <div class="feature-card">
        <div class="feature-icon">🤖</div>
        <h3 class="feature-title">AI Native</h3>
        <p class="feature-desc">
          Logic-first architecture means AI agents reason about your app the same way you do — data in, state out. Fewer
          tokens, fewer hallucinations.
        </p>
      </div>
    </div>

    <p class="docs-hint">
      <a href="https://docs.airlib.dev" target="_blank" rel="noreferrer">
        Read the docs
      </a>
      {' · '}
      <a href="https://github.com/beerush-id/anchor" target="_blank" rel="noreferrer">
        GitHub
      </a>
    </p>
  </>
));
export default RootPage;
