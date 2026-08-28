import { Head, mutable, page, Snippet } from '@airlib/react';
import airLogo from '@/assets/airlib.svg';
import heroImg from '@/assets/hero.png?asset' with { sizes: '170' };
import reactLogo from '@/assets/react.svg';
import viteLogo from '@/assets/vite.svg';
import { rootIndexRoute } from './route.js';

export default page(rootIndexRoute).render(() => {
  const count = mutable(0);

  return (
    <>
      <Head meta={{ title: 'AirLib', description: 'AirLib starter template.' }} />
      <section id="center">
        <div className="hero-list">
          <img src={airLogo} className="airlib" width="179" height="179" alt="AirLib logo" />
          <div className="hero">
            <img src={heroImg.src} className="base" width="170" height="179" alt="Hero" />
            <img src={reactLogo} className="framework" alt="React logo" />
            <img src={viteLogo} className="vite" alt="Vite logo" />
          </div>
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/pages/page.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <Snippet>
          {() => (
            <button type="button" className="counter" onClick={() => count.value++}>
              Count is {count.value}
            </button>
          )}
        </Snippet>
      </section>
    </>
  );
});