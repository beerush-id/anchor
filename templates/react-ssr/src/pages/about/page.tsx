import { Meta, page, Title } from '@anchorlib/react';
import { aboutRoute } from './route.js';

export const AboutPage = page(aboutRoute).render(() => (
  <>
    <Title>About — AIR Stack</Title>
    <Meta name="description" content="Anchor for React — fine-grained reactive state, SSR routing, and zero hooks." />

    <h1 className="hero-heading">
      <span className="brand-dim">About&nbsp;</span>
      <span className="brand-anchor">AIR Stack</span>
    </h1>

    <p className="hero-subtitle">
      Anchor + React — fine-grained reactivity that replaces hooks, external stores, and re-render optimization. Vite
      SSR handles server rendering out of the box.
    </p>

    <div className="card about-card">
      <ul className="about-list">
        <li>
          <strong className="brand-anchor">Anchor</strong> — Reactive state management. Mutate objects directly, and
          only the exact DOM fragments reading that data update. No re-render cascades.
        </li>
        <li>
          <strong className="brand-react">React</strong> — Rendering surface only. Anchor controls reactivity; React
          paints the DOM.
        </li>
        <li>
          <strong className="brand-vite">Vite SSR</strong> — Server-side rendering with Express + Vite middleware.
          Routes pre-render on the server, hydrate on the client.
        </li>
      </ul>
    </div>
  </>
));
export default AboutPage;
