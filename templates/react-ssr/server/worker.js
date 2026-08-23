import worker from '../dist/server/worker.js';

export default {
  fetch(req, env) {
    return worker.fetch(req, env);
  },
};
