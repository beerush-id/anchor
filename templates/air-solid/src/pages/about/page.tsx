import { Meta, page, Title } from '@anchorlib/solid';
import { aboutRoute } from './route.js';

export const AboutPage = page(aboutRoute).render(() => (
  <>
    <Title>About — AIR Stack</Title>
    <Meta name="description" content="Anchor for Solid — fine-grained reactive state, SSR routing, and zero boilerplate." />

    <h1 class="hero-heading">
      <span class="brand-dim">About&nbsp;</span>
      <span class="brand-anchor">AIR Stack</span>
    </h1>

    <p class="hero-subtitle">
      Anchor + Solid — fine-grained reactivity that eliminates boilerplate, external stores, and re-render optimization.
      Vite SSR handles server rendering out of the box.
    </p>

    <div class="card about-card">
      <ul class="about-list">
        <li>
          <strong class="brand-anchor">Anchor</strong> — Reactive state management. Mutate objects directly, and
          only the exact DOM fragments reading that data update. No re-render cascades.
        </li>
        <li>
          <strong class="brand-solid">Solid</strong> — Rendering surface only. Anchor controls reactivity; Solid
          paints the DOM with surgical precision.
        </li>
        <li>
          <strong class="brand-vite">Vite SSR</strong> — Server-side rendering with Express + Vite middleware.
          Routes pre-render on the server, hydrate on the client.
        </li>
      </ul>
    </div>
  </>
));
export default AboutPage;
