import { type AnyRoute, classx, For, Link } from '@airlib/react';
import routes from '@airlib-cache/manifest';
import type { ComponentProps } from 'react';
import airLogo from '../assets/airlib.svg';
import rootRoute from '../pages/route.js';

const navs = ['/about', '/docs']
  .map((name) => {
    const route = routes.find((route) => route.path === name);
    if (route)
      return {
        path: route.path,
        route: route.route.isIndex ? route.route.parent : route.route,
        meta: route.route.metadata,
      };
  })
  .filter(Boolean) as Array<{
  path: string;
  route: AnyRoute;
  meta: AirRouteMeta;
}>;

export default function Header({ children, className }: ComponentProps<'header'>) {
  return (
    <header className={classx('air-header', className)}>
      <div className="air-header-inner">
        <Link to={rootRoute} className="air-header-logo">
          <img src={airLogo} width="36" alt="AirLib Logo" />
          <span>AirLib</span>
        </Link>
        <div className="md:w-44"></div>

        {children}

        <div className="flex-1"></div>
        <nav className="air-header-nav mx-10">
          <For each={() => navs}>
            {({ route, path, meta }) => (
              <Link to={route} className="air-header-link" activeClass="active">
                {meta.label ?? path}
              </Link>
            )}
          </For>
        </nav>
        <ul className="air-header-socials">
          <li>
            <a href="https://github.com/beerush-id/airlib" target="_blank">
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
      </div>
    </header>
  );
}
