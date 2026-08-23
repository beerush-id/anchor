import { page } from '@airlib/react';
import airLogo from '@/assets/airlib.svg';
import reactLogo from '@/assets/react.svg';
import viteLogo from '@/assets/vite.svg';
import { ErrorView } from '@/components/ErrorView.js';
import Header from '@/components/Header.js';
import rootRoute from './route.js';

rootRoute.catch(({ error }) => <ErrorView error={error} />);

export default page(rootRoute).render(({ children }) => (
  <>
    <Header />
    <main>{children}</main>
    <footer>
      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://airlib.dev/" target="_blank">
                <img className="logo" src={airLogo} alt="AirLib Logo" />
                Explore AirLib
              </a>
            </li>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} height={18} alt="Vite Logo" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="React Logo" />
                Learn React
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/beerush-id/airstack" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://discord.gg/GJSXpKjxFR" target="_blank">
                <svg className="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </footer>
  </>
));
