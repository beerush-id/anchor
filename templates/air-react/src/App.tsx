import { type AppEntry, UIRouter } from '@airlib/react';
import RootLayout from '@/pages/layout.js';
import router from './router.js';

export default (({ url }) => {
  return <UIRouter router={router} root={RootLayout} url={url} />;
}) satisfies AppEntry;