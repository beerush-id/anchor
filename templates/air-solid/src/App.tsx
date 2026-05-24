import './styles/styles.css';

import { UIRouter } from '@anchorlib/solid';
import { render } from 'solid-js/web';
import { router } from './lib/router.js';
import { RootLayout } from './pages/layout.js';

router.activate(window.location.href).then(() => {
  const root = document.getElementById('root')!;
  root.innerHTML = '';
  render(() => <UIRouter router={router} root={RootLayout} headless={true} resetScroll />, root);
});
