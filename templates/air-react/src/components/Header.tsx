import { Link, template } from '@anchorlib/react';
import airstackLogo from '../assets/airstack.svg';
import { AboutPage } from '../pages/about/index.js';
import { SignInPage } from '../pages/auth/index.js';
import { RootPage } from '../pages/page.js';
import { ThemeToggle } from './ThemeToggle.js';

export const Header = template(
  () => (
    <header className="app-header">
      <div className="header-inner">
        <Link to={RootPage} className="header-brand">
          <img src={airstackLogo} alt="AIR Stack" className="header-logo" />
          <span className="header-title">AIR Stack</span>
        </Link>
        <nav className="header-nav">
          <Link to={AboutPage} activeClass="nav-active">
            About
          </Link>
          <Link to={SignInPage} activeClass="nav-active">
            Sign In
          </Link>
          <a href="https://github.com/beerush-id/airstack" target="_blank" rel="noreferrer">
            GitHub
          </a>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  ),
  'Header'
);
export default Header;
