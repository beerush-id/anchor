import { classx, Link } from '@airlib/react';
import type { ComponentProps } from 'react';
import airLogo from '@/assets/airlib.svg';
import {
  docsExtendedMarkdownRoute,
  docsGettingStartedRoute,
  docsIndexRoute,
  docsInstallationRoute,
  docsUniversalSsrRoute,
} from '@/pages/(docs)/route.js';
import { postsRoute } from '@/pages/posts/route.js';
import { releasesRoute } from '@/pages/releases/route.js';
import rootRoute from '@/pages/route.js';
import { DiscordIcon, GitHubIcon } from './icons.js';
import { LogoText } from './LogoText.js';

const stack = [
  { label: 'Anchor', description: 'Reactive State Engine', href: '/docs/state-management' },
  { label: 'IRPC', description: 'Reactive Network Abstraction', href: '/docs/remote-function' },
  { label: 'Router', description: 'Reactive Routing Engine', href: '/docs/routing' },
  { label: 'Workflows', description: 'Promise-like Execution Pipelines', href: '/docs/workflow' },
];

export default function Footer({ className }: ComponentProps<'footer'>) {
  return (
    <footer className={classx('air-footer', className)}>
      <div className="air-section-inner air-footer-inner">
        <div className="air-footer-brand">
          <Link to={rootRoute} className="air-footer-logo" aria-label="AirLib Logo">
            <LogoText className="air-footer-logo" />
          </Link>
          <p className="air-footer-tagline">
            Zero-Boilerplate, AI-Native full-stack TypeScript framework. Reactive state, isomorphic remote functions,
            and universal SSR in one strongly typed stack.
          </p>
          <ul className="air-footer-socials">
            <li>
              <a href="https://github.com/beerush-id/airstack" target="_blank" aria-label="AirLib on GitHub">
                <GitHubIcon />
                <span>GitHub</span>
              </a>
            </li>
            <li>
              <a href="https://discord.gg/GJSXpKjxFR" target="_blank" aria-label="AirLib Discord community">
                <DiscordIcon />
                <span>Discord</span>
              </a>
            </li>
          </ul>
        </div>

        <nav className="air-footer-columns" aria-label="Footer">
          <section className="air-footer-column">
            <h3>The Stack</h3>
            <ul>
              {stack.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className="air-footer-stack-link">
                    <strong>{item.label}</strong>
                    <span>{item.description}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="air-footer-column">
            <h3>Learn</h3>
            <ul>
              <li>
                <Link to={docsIndexRoute}>Overview</Link>
              </li>
              <li>
                <Link to={docsInstallationRoute}>Installation</Link>
              </li>
              <li>
                <Link to={docsGettingStartedRoute}>Getting Started</Link>
              </li>
              <li>
                <Link to={docsExtendedMarkdownRoute}>Extended Markdown</Link>
              </li>
              <li>
                <Link to={docsUniversalSsrRoute}>Universal SSR</Link>
              </li>
            </ul>
          </section>

          <section className="air-footer-column">
            <h3>Community</h3>
            <ul>
              <li>
                <Link to={releasesRoute}>Releases</Link>
              </li>
              <li>
                <Link to={postsRoute}>Posts</Link>
              </li>
              <li>
                <a href="https://github.com/beerush-id/airstack" target="_blank" rel="noreferrer">
                  GitHub
                </a>
              </li>
              <li>
                <a href="https://discord.gg/GJSXpKjxFR" target="_blank" rel="noreferrer">
                  Discord
                </a>
              </li>
            </ul>
          </section>
        </nav>
      </div>

      <div className="air-footer-bottom">
        <div className="air-section-inner air-footer-bottom-inner">
          <span>
            © {new Date().getFullYear()} AirLib · Made with love by{' '}
            <a href="https://mahdaen.name" target="_blank" rel="noreferrer" className="whitespace-nowrap">
              Nanang Mahdaen El Agung
            </a>
          </span>
          <span>One Stack &middot; Deploy Anywhere</span>
        </div>
      </div>
    </footer>
  );
}
