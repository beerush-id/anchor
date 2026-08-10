import { Link, NotFoundError, type RouteError } from '@anchorlib/solid';
import airLogo from '../assets/airstack.svg';
import heroImg from '../assets/hero.png?airimg';
import solidLogo from '../assets/solid.svg';
import viteLogo from '../assets/vite.svg';
import rootRoute from '../pages/route.js';

export function ErrorView({ error }: { error?: RouteError }) {
  return (
    <section id="center">
      <div class="hero-list">
        <img src={airLogo} class="airstack" width="179" height="179" alt="AIR Stack logo" />
        <div class="hero">
          <img src={heroImg.src} class="base" width="170" height="179" alt="Hero" />
          <img src={solidLogo} class="framework" alt="Solid logo" />
          <img src={viteLogo} class="vite" alt="Vite logo" />
        </div>
      </div>

      <h1>{error instanceof NotFoundError ? '404' : '500'}</h1>
      <p>{error.message}</p>
      <div class="ticks error-section">
        <Link to={rootRoute}>Back to Home</Link>
      </div>
    </section>
  );
}