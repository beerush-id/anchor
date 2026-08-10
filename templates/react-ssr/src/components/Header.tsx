import routes from '@airstack/manifest';
import { type AnyRoute, For, Link } from '@anchorlib/react';
import type { ComponentProps } from 'react';
import airLogo from '../assets/airstack.svg';
import rootRoute from '../pages/route.js';

const navRoutes = routes.filter((r) => r.path !== '/') as unknown as Array<{
  path: string;
  route: AnyRoute;
}>;

export default function Header({ children }: ComponentProps<'header'>) {
  return (
    <header>
      <Link to={rootRoute} className="header-logo">
        <img src={airLogo} width="20" alt="AIR Stack Logo" />
        <span>AIR Stack</span>
      </Link>
      <nav className="header-nav">
        <For each={() => navRoutes}>
          {({ route, path }) => (
            <Link to={route} className="head-link">
              {route.metadata.label ?? path}
            </Link>
          )}
        </For>
      </nav>
      {children}
      <ul className="header-socials">
        <li>
          <a href="https://github.com/beerush-id/airstack" target="_blank">
            <svg className="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#github-icon"></use>
            </svg>
            <span>GitHub</span>
          </a>
        </li>
        <li>
          <a href="https://discord.gg/GJSXpKjxFR" target="_blank">
            <svg className="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#discord-icon"></use>
            </svg>
            <span>Discord</span>
          </a>
        </li>
      </ul>
    </header>
  );
}