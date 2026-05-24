import { NotFoundError, page } from '@anchorlib/react';
import { Footer } from '../components/Footer.js';
import { Header } from '../components/Header.js';
import { router } from '../lib/router.js';
import { createSettings } from '../lib/settings.js';
import { rootRoute } from './route.js';

router.catch(({ error }) => {
  if (error instanceof NotFoundError) {
    return (
      <div className="error-page">
        <h1 className="error-title">404</h1>
        <p className="error-desc">Page not found</p>
      </div>
    );
  }

  return (
    <div className="error-page">
      <h1 className="error-title">500</h1>
      <p className="error-desc">Internal Server Error</p>
    </div>
  );
});

export const RootLayout = page(rootRoute).render(({ children }) => {
  createSettings();

  return (
    <div>
      <Header />
      <main className="layout-main">{children}</main>
      <Footer />
    </div>
  );
});
export default RootLayout;
