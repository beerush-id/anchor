import worker from '../dist/server/worker.js';

export default {
  fetch(req, env, ctx) {
    return worker.fetch(req, env, ctx);
  },
};
