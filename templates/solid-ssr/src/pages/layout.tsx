import { page } from '@anchorlib/solid';
import { Footer } from '../components/Footer.js';
import { Header } from '../components/Header.js';
import { router } from '../lib/router.js';
import { createSettings } from '../lib/settings.js';
import { rootRoute } from './route.js';

router.catch(() => {
  return (
    <div class="error-page">
      <h1 class="error-title">404</h1>
      <p class="error-desc">Page not found</p>
    </div>
  );
});

export const RootLayout = page(rootRoute).render((_state, _ctx, children) => {
  createSettings();

  return (
    <div>
      <Header />
      <main class="layout-main">{children}</main>
      <Footer />
    </div>
  );
});
export default RootLayout;
