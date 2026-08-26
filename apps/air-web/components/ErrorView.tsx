import { Link, NotFoundError, type RouteError } from '@airlib/react';
import airLogo from '../assets/airlib.svg';
import heroImg from '../assets/hero.png?asset' with { sizes: '170' };
import reactLogo from '../assets/react.svg';
import viteLogo from '../assets/vite.svg';
import rootRoute from '../pages/route.ts';

export function ErrorView({ error }: { error?: RouteError }) {
  return (
    <section className={classes.center}>
      <div className={classes.logos}>
        <img src={airLogo} className="airlib" width="179" height="179" alt="AirLib logo" />
        <div className={classes.hero}>
          <img src={heroImg.src} className={classes.base} width="170" height="179" alt="Hero" />
          <img src={reactLogo} className={classes.framework} alt="React logo" />
          <img src={viteLogo} className={classes.vite} alt="Vite logo" />
        </div>
      </div>

      <h1 className="air-display">{error instanceof NotFoundError ? '404' : '500'}</h1>
      <p>{error?.message}</p>
      <div className={classes.divider}>
        <Link to={rootRoute} className="mt-6">
          Back to Home
        </Link>
      </div>
    </section>
  );
}

const classes = {
  center: 'flex grow flex-col place-content-center place-items-center gap-4.5 px-5 pt-8 pb-6 lg:gap-6.25 lg:p-0',
  logos: 'flex gap-6',
  hero: 'relative',
  base: 'relative z-0 w-42.5 [inset-inline:0] mx-auto',
  framework:
    'absolute z-1 top-8.5 h-7 [inset-inline:0] mx-auto [transform:perspective(2000px)_rotateZ(300deg)_rotateX(44deg)_rotateY(39deg)_scale(1.4)]',
  vite: 'absolute z-0 top-26.75 h-6.5 w-auto [inset-inline:0] mx-auto [transform:perspective(2000px)_rotateZ(300deg)_rotateX(40deg)_rotateY(39deg)_scale(0.8)]',
  divider:
    "relative flex w-full flex-col border-t border-border before:absolute before:top-[-4.5px] before:left-0 before:border-[5px] before:border-transparent before:border-l-border before:content-[''] after:absolute after:top-[-4.5px] after:right-0 after:border-[5px] after:border-transparent after:border-r-border after:content-['']",
};
