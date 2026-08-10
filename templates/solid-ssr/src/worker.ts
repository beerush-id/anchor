import { createApp } from '@anchorlib/solid/ssr';
import App from './app.js';
import router from './router.js';

export default createApp(router, App);