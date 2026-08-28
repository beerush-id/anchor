import { type AppEntry, UIRouter } from '@airlib/react';
import { ThemeToggler } from '@/components/ThemeToggler.tsx';
import RootLayout from '@/pages/layout.tsx';
import router from './router.ts';

export default (({ url }) => (
  <UIRouter router={router} root={RootLayout} url={url}>
    <ThemeToggler />
  </UIRouter>
)) satisfies AppEntry;
