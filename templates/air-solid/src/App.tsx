import { type AppEntry, UIRouter } from '@airlib/solid';
import RootLayout from '@/pages/layout.tsx';
import router from './router.js';

export default (({ url }) => {
  return <UIRouter router={router} root={RootLayout} url={url} />;
}) satisfies AppEntry;