import { type AnyRoute, classx, For, Link, Slot, setup } from '@airlib/react';
import type { ComponentProps, ReactNode } from 'react';
import docsRoute from '../pages/(docs)/route.js';
import postsRoute from '../pages/posts/route.js';
import releasesRoute from '../pages/releases/route.js';
import rootRoute from '../pages/route.js';
import { DiscordIcon, GitHubIcon } from './icons.js';
import { LogoText } from './LogoText.js';
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
        <Link to={rootRoute} className="air-header-logo" aria-label="AirLib Logo">
          <LogoText className="logo-text-image" />
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
            <a href="https://github.com/beerush-id/airstack" target="_blank">
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
