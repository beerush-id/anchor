import { Head, mutable, page } from '@airlib/solid';
import airLogo from '@/assets/airlib.svg';
import heroImg from '@/assets/hero.png?airimg' with { sizes: '170' };
import solidLogo from '@/assets/solid.svg';
import viteLogo from '@/assets/vite.svg';
import { rootIndexRoute } from './route.js';

export default page(rootIndexRoute).render(() => {
  const count = mutable(0);

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
        <button type="button" class="counter" onClick={() => count.value++}>
          Count is {count.value}
        </button>
      </section>
    </>
  );
});