import { $bind, Head, mutable, page } from '@airlib/solid';
import airLogo from '@/assets/airlib.svg';
import heroImg from '@/assets/hero.png?airimg' with { sizes: '170' };
import solidLogo from '@/assets/solid.svg';
import viteLogo from '@/assets/vite.svg';
import { TextInput } from '@/components/TextInput.tsx';
import { rootIndexRoute } from './route.ts';

export default page(rootIndexRoute).render(() => {
  const count = mutable(0);
  const user = mutable({ message: '' });

  return (
    <>
      <Head meta={{ title: 'AirLib', description: 'AirLib starter template.' }} />
      <section id="center">
        <div class="hero-list">
          <img src={airLogo} class="airlib" width="179" height="179" alt="AirLib logo" />
          <div class="hero">
            <img src={heroImg.src} class="base" width="170" height="179" alt="Hero" />
            <img src={solidLogo} class="framework" alt="Solid logo" />
            <img src={viteLogo} class="vite" alt="Vite logo" />
          </div>
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/pages/page.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <div style={{ display: 'flex', 'flex-direction': 'column', 'align-items': 'center' }}>
          <button type="button" class="counter" onClick={() => count.value++}>
            Count is {count.value}
          </button>
          <TextInput class="message-input" placeholder="Type message..." value={$bind(user, 'message')} />
        </div>
      </section>

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
              <a href="https://github.com/beerush-id/airlib" target="_blank">
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
    </>
  );
});