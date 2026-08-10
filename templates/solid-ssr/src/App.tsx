import { type AppEntry, UIRouter } from '@anchorlib/solid';
import RootLayout from './pages/layout.js';
import router from './router.js';

export default (({ url }) => {
  return <UIRouter router={router} root={RootLayout} url={url} />;
}) satisfies AppEntry;