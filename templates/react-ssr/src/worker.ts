import { createApp } from '@airlib/react/ssr';
import App from './app.js';
import router from './router.js';

export default createApp(router, App);