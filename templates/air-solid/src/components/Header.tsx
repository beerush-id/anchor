import { Link } from '@anchorlib/solid';
import airstackLogo from '../assets/airstack.svg';
import { AboutPage } from '../pages/about/index.js';
import { SignInPage } from '../pages/auth/index.js';
import { RootPage } from '../pages/page.js';
import { ThemeToggle } from './ThemeToggle.js';

export function Header() {
  return (
    <header class="app-header">
      <div class="header-inner">
        <Link to={RootPage} class="header-brand">
          <img src={airstackLogo} alt="AIR Stack" class="header-logo" />
          <span class="header-title">AIR Stack</span>
        </Link>
        <nav class="header-nav">
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
  );
}
export default Header;
