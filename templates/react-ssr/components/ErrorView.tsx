import { Link, NotFoundError, type RouteError } from '@airlib/react';
import airLogo from '@/assets/airlib.svg';
import heroImg from '@/assets/hero.png?asset' with { sizes: '170' };
import reactLogo from '@/assets/react.svg';
import viteLogo from '@/assets/vite.svg';
import rootRoute from '@/pages/route.js';

export function ErrorView({ error }: { error?: RouteError }) {
  return (
    <section id="center">
      <div className="hero-list">
        <img src={airLogo} className="airlib" width="179" height="179" alt="AirLib logo" />
        <div className="hero">
          <img src={heroImg.src} className="base" width="170" height="179" alt="Hero" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
      </div>

      <h1>{error instanceof NotFoundError ? '404' : '500'}</h1>
      <p>{error?.message}</p>
      <div className="ticks error-section">
        <Link to={rootRoute}>Back to Home</Link>
      </div>
    </section>
  );
}