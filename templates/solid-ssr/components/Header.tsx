import routes from '@airlib-cache/manifest';
import { type AnyRoute, For, Link } from '@airlib/solid';
import type { JSX } from 'solid-js';
import airLogo from '@/assets/airlib.svg';
import rootRoute from '@/pages/route.js';

const navRoutes = routes.filter((r) => r.path !== '/') as unknown as Array<{
  path: string;
  route: AnyRoute;
}>;

export default function Header(props: { children?: JSX.Element }) {
  return (
    <header>
      <Link to={rootRoute} class="header-logo">
        <img src={airLogo} width="20" alt="AirLib Logo" />
        <span>AirLib</span>
      </Link>
      <nav class="header-nav">
        <For each={navRoutes}>
          {({ route, path }) => (
            <Link to={route} class="head-link">
              {route.metadata.label ?? path}
            </Link>
          )}
        </For>
      </nav>
      {props.children}
      <ul class="header-socials">
        <li>
          <a href="https://github.com/beerush-id/airstack" target="_blank">
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#github-icon"></use>
            </svg>
            <span>GitHub</span>
          </a>
        </li>
        <li>
          <a href="https://discord.gg/GJSXpKjxFR" target="_blank">
            <svg class="button-icon" role="presentation" aria-hidden="true">
              <use href="/icons.svg#discord-icon"></use>
            </svg>
            <span>Discord</span>
          </a>
        </li>
      </ul>
    </header>
  );
}