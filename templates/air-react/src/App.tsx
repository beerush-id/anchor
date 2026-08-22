import { type AppEntry, UIRouter } from '@airlib/react';
import RootLayout from '@/pages/layout.tsx';
import router from './router.ts';

export default (({ url }) => {
  return <UIRouter router={router} root={RootLayout} url={url} />;
}) satisfies AppEntry;