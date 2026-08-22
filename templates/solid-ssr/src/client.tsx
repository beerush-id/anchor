import { hydrate } from 'solid-js/web';
import App from './app.js';
import router from './router.js';

import './app.css';
import { acceptInteractions } from '@airlib/solid/browser';

router
  .activate(window.location.href)
  .then(() => {
    hydrate(() => <App />, document.getElementById('root')!);
  })
  .then(() => acceptInteractions());