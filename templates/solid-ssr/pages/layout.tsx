import { page } from '@airlib/solid';
import airLogo from '@/assets/airlib.svg';
import solidLogo from '@/assets/solid.svg';
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
      <div class="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg class="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://airlib.dev/" target="_blank">
                <img class="logo" src={airLogo} alt="AirLib Logo" />
                Explore AirLib
              </a>
            </li>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img class="logo" src={viteLogo} alt="Vite Logo" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://www.solidjs.com/" target="_blank">
                <img class="button-icon" src={solidLogo} alt="Solid Logo" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg class="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/beerush-id/airstack" target="_blank">
                <svg class="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://discord.gg/GJSXpKjxFR" target="_blank">
                <svg class="button-icon" role="presentation" aria-hidden="true">
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div class="ticks"></div>
      <section id="spacer"></section>
    </footer>
  </>
));