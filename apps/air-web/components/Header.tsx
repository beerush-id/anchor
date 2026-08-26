import { type AnyRoute, classx, For, Link, setup, Slot } from '@airlib/react';
import type { ComponentProps, ReactNode } from 'react';
import airLogo from '../assets/airlib.svg';
import postsRoute from '../pages/(docs)/posts/route.js';
import releasesRoute from '../pages/(docs)/releases/route.js';
import docsRoute from '../pages/(docs)/route.js';
import rootRoute from '../pages/route.js';
import { DiscordIcon, GitHubIcon } from './icons.js';
import { Search } from './Search.js';

const navs = [
  {
    text: 'Docs',
    route: docsRoute,
  },
  {
    text: 'Posts',
    route: postsRoute,
  },
  {
    text: 'Releases',
    route: releasesRoute,
  },
];

type HeaderProps = ComponentProps<'header'>;
type HeaderSlots = {
  nav?: () => ReactNode;
  search?: () => ReactNode;
};

const Header = setup<HeaderProps, HeaderSlots>((props, snippets) => {
  return (
    <header className={classx('air-header', props.className)}>
      <div className="air-header-inner">
        <Link to={rootRoute} className="air-header-logo">
          <img src={airLogo} width="36" alt="AirLib Logo" />
          <span className={'text-2xl font-normal tracking-wide'}>AirLib</span>
        </Link>
        <Slot for={() => snippets.nav?.()}>
          <nav className="air-header-nav mx-10">
            <For each={() => navs}>
              {({ route, text }) => (
                <Link to={route as AnyRoute} className="air-header-link" activeClass="active">
                  {text}
                </Link>
              )}
            </For>
          </nav>
        </Slot>
        <div className="flex-1">{props.children}</div>
        <Slot for={() => snippets.search?.()}>
          <div className="mx-5">
            <Search />
          </div>
        </Slot>
        <ul className="air-header-socials">
          <li>
            <a href="https://github.com/beerush-id/airlib" target="_blank">
              <GitHubIcon />
              <span>GitHub</span>
            </a>
          </li>
          <li>
            <a href="https://discord.gg/GJSXpKjxFR" target="_blank">
              <DiscordIcon />
              <span>Discord</span>
            </a>
          </li>
        </ul>
      </div>
    </header>
  );
}, 'Header');

export default Header;
